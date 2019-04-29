"use strict";
/**
 * Defines base class for CMake drivers
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const shlex = require("@cmt/shlex");
const path = require("path");
const vscode = require("vscode");
const codepages = require("./code-pages");
const expand = require("./expand");
const kit_1 = require("./kit");
const logging = require("./logging");
const paths_1 = require("./paths");
const pr_1 = require("./pr");
const proc = require("./proc");
const rollbar_1 = require("./rollbar");
const util = require("./util");
const log = logging.createLogger('driver');
/**
 * Base class for CMake drivers.
 *
 * CMake drivers are separated because different CMake version warrant different
 * communication methods. Older CMake versions need to be driven by the command
 * line, but newer versions may be controlled via CMake server, which provides
 * a much richer interface.
 *
 * This class defines the basis for what a driver must implement to work.
 */
class CMakeDriver {
    /**
     * Construct the driver. Concrete instances should provide their own creation
     * routines.
     */
    constructor(cmake, ws) {
        this.cmake = cmake;
        this.ws = ws;
        /**
         * The environment variables required by the current kit
         */
        this._kitEnvironmentVariables = new Map();
        /**
         * The current Kit. Starts out `null`, but once set, is never `null` again.
         * We do some separation here to protect ourselves: The `_baseKit` property
         * is `private`, so derived classes cannot change it, except via
         * `_setBaseKit`, which only allows non-null kits. This prevents the derived
         * classes from resetting the kit back to `null`.
         */
        this._kit = null;
        /**
         * File compilation terminals. This is a map, rather than a single terminal
         * instance for two reasons:
         *
         * 1. Different compile commands may require different environment variables.
         * 2. Different compile commands may require different working directories.
         *
         * The key of each terminal is generated deterministically in `runCompileCommand()`
         * based on the CWD and environment of the compile command.
         */
        this._compileTerms = new Map();
        /**
         * The CMAKE_BUILD_TYPE to use
         */
        this._variantBuildType = 'Debug';
        /**
         * The arguments to pass to CMake during a configuration according to the current variant
         */
        this._variantConfigureSettings = {};
        /**
         * Determine if we set BUILD_SHARED_LIBS to TRUE or FALSE
         */
        this._variantLinkage = null;
        /**
         * Environment variables defined by the current variant
         */
        this._variantEnv = {};
        this._isBusy = false;
        this._sourceDirectory = '';
        this._binaryDir = '';
        this._installDir = null;
        this._copyCompileCommandsPath = null;
        /**
         * Subscribe to changes that affect the CMake configuration
         */
        this._settingsSub = this.ws.config.onChange('configureSettings', () => this.doConfigureSettingsChange());
        this._argsSub = this.ws.config.onChange('configureArgs', () => this.doConfigureSettingsChange());
        this._envSub = this.ws.config.onChange('configureEnvironment', () => this.doConfigureSettingsChange());
        /**
         * The currently running process. We keep a handle on it so we can stop it
         * upon user request
         */
        this._currentProcess = null;
        // We have a cache of file-compilation terminals. Wipe them out when the
        // user closes those terminals.
        vscode.window.onDidCloseTerminal(closed => {
            for (const [key, term] of this._compileTerms) {
                if (term === closed) {
                    log.debug('Use closed a file compilation terminal');
                    this._compileTerms.delete(key);
                    break;
                }
            }
        });
    }
    doPreBuild() { return Promise.resolve(true); }
    doPostBuild() { return Promise.resolve(true); }
    /**
     * Dispose the driver. This disposes some things synchronously, but also
     * calls the `asyncDispose()` method to start any asynchronous shutdown.
     */
    dispose() {
        log.debug('Disposing base CMakeDriver');
        for (const term of this._compileTerms.values()) {
            term.dispose();
        }
        for (const sub of [this._settingsSub, this._argsSub, this._envSub]) {
            sub.dispose();
        }
        rollbar_1.default.invokeAsync('Async disposing CMake driver', () => this.asyncDispose());
    }
    /**
     * Get the environment variables required by the current Kit
     */
    getKitEnvironmentVariablesObject() {
        return util.reduce(this._kitEnvironmentVariables.entries(), {}, (acc, [key, value]) => (Object.assign({}, acc, { [key]: value })));
    }
    /**
     * Get the environment variables that should be set at CMake-configure time.
     */
    async getConfigureEnvironment() {
        return util.mergeEnvironment(this.getKitEnvironmentVariablesObject(), await this.getExpandedEnvironment(), await this.getBaseConfigureEnvironment(), this._variantEnv);
    }
    get onProgress() {
        return (_cb) => new util.DummyDisposable();
    }
    /**
     * Get the environment and apply any needed
     * substitutions before returning it.
     */
    async getExpandedEnvironment() {
        const env = {};
        const opts = this.expansionOptions;
        await Promise.resolve(util.objectPairs(this.ws.config.environment)
            .forEach(async ([key, value]) => env[key] = await expand.expandString(value, opts)));
        return env;
    }
    /**
     * Get the configure environment and apply any needed
     * substitutions before returning it.
     */
    async getBaseConfigureEnvironment() {
        const config_env = {};
        const opts = this.expansionOptions;
        await Promise.resolve(util.objectPairs(this.ws.config.configureEnvironment)
            .forEach(async ([key, value]) => config_env[key] = await expand.expandString(value, opts)));
        return config_env;
    }
    /**
     * Get the vscode root workspace folder.
     *
     * @returns Returns the vscode root workspace folder. Returns `null` if no folder is open or the folder uri is not a
     * `file://` scheme.
     */
    get _workspaceRootPath() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders[0].uri.scheme !== 'file') {
            return null;
        }
        return util.lightNormalizePath(vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
    /**
     * The options that will be passed to `expand.expandString` for this driver.
     */
    get expansionOptions() {
        const ws_root = this._workspaceRootPath || '.';
        // Fill in default replacements
        const vars = {
            workspaceRoot: ws_root,
            workspaceFolder: ws_root,
            buildType: this.currentBuildType,
            workspaceRootFolderName: path.basename(ws_root),
            generator: this.generatorName || 'null',
            userHome: paths_1.default.userHome,
            buildKit: this._kit ? this._kit.name : '__unknownkit__',
            // DEPRECATED EXPANSION: Remove this in the future:
            projectName: 'ProjectName',
        };
        // Update Variant replacements
        const variantSettings = this.ws.state.activeVariantSettings;
        const variantVars = {};
        if (variantSettings) {
            variantSettings.forEach((value, key) => variantVars[key] = value);
        }
        return { vars, variantVars };
    }
    getEffectiveSubprocessEnvironment(opts) {
        const cur_env = process.env;
        return util.mergeEnvironment(cur_env, this.getKitEnvironmentVariablesObject(), (opts && opts.environment) ? opts.environment : {});
    }
    executeCommand(command, args, consumer, options) {
        const environment = this.getEffectiveSubprocessEnvironment(options);
        const exec_options = Object.assign({}, options, { environment });
        return proc.execute(command, args, consumer, exec_options);
    }
    /**
     * Launch the given compilation command in an embedded terminal.
     * @param cmd The compilation command from a compilation database to run
     */
    runCompileCommand(cmd) {
        if ('command' in cmd) {
            const args = [...shlex.split(cmd.command)];
            return this.runCompileCommand({ directory: cmd.directory, file: cmd.file, arguments: args });
        }
        else {
            const env = this.getEffectiveSubprocessEnvironment();
            const key = `${cmd.directory}${JSON.stringify(env)}`;
            let existing = this._compileTerms.get(key);
            const shellPath = process.platform === 'win32' ? 'cmd.exe' : undefined;
            if (!existing) {
                const term = vscode.window.createTerminal({
                    name: 'File Compilation',
                    cwd: cmd.directory,
                    env,
                    shellPath,
                });
                this._compileTerms.set(key, term);
                existing = term;
            }
            existing.show();
            existing.sendText(cmd.arguments.map(s => shlex.quote(s)).join(' ') + '\r\n');
            return existing;
        }
    }
    /**
     * Remove the prior CMake configuration files.
     */
    async _cleanPriorConfiguration() {
        const build_dir = this.binaryDir;
        const cache = this.cachePath;
        const cmake_files = path.join(build_dir, 'CMakeFiles');
        if (await pr_1.fs.exists(cache)) {
            log.info('Removing ', cache);
            await pr_1.fs.unlink(cache);
        }
        if (await pr_1.fs.exists(cmake_files)) {
            log.info('Removing ', cmake_files);
            await pr_1.fs.rmdir(cmake_files);
        }
    }
    /**
     * Change the current kit. This lets the driver reload, if necessary.
     * @param kit The new kit
     */
    async setKit(kit) {
        log.info(`Switching to kit: ${kit.name}`);
        const opts = this.expansionOptions;
        opts.vars.buildKit = kit.name;
        const newBinaryDir = util.lightNormalizePath(await expand.expandString(this.ws.config.buildDirectory, opts));
        const needs_clean = this.binaryDir === newBinaryDir && kit_1.kitChangeNeedsClean(kit, this._kit);
        await this.doSetKit(needs_clean, async () => { await this._setKit(kit); });
    }
    async _setKit(kit) {
        this._kit = Object.seal(Object.assign({}, kit));
        log.debug('CMakeDriver Kit set to', kit.name);
        this._kitEnvironmentVariables = await kit_1.effectiveKitEnvironment(kit);
    }
    /**
     * Change the current options from the variant.
     * @param opts The new options
     */
    async setVariantOptions(opts) {
        log.debug('Setting new variant', opts.long || '(Unnamed)');
        this._variantBuildType = opts.buildType || this._variantBuildType;
        this._variantConfigureSettings = opts.settings || this._variantConfigureSettings;
        this._variantLinkage = opts.linkage || null;
        this._variantEnv = opts.env || {};
        await this._refreshExpansions();
    }
    /**
     * Is the driver busy? ie. running a configure/build/test
     */
    get isBusy() { return this._isBusy; }
    /**
     * The source directory, where the root CMakeLists.txt lives.
     *
     * @note This is distinct from the config values, since we do variable
     * substitution.
     */
    get sourceDir() { return this._sourceDirectory; }
    doRefreshExpansions(cb) { return cb(); }
    async _refreshExpansions() {
        log.debug('Run _refreshExpansions');
        return this.doRefreshExpansions(async () => {
            log.debug('Run _refreshExpansions cb');
            const opts = this.expansionOptions;
            this._sourceDirectory = util.lightNormalizePath(await expand.expandString(this.ws.config.sourceDirectory, opts));
            this._binaryDir = util.lightNormalizePath(await expand.expandString(this.ws.config.buildDirectory, opts));
            const installPrefix = this.ws.config.installPrefix;
            if (installPrefix) {
                this._installDir = util.lightNormalizePath(await expand.expandString(installPrefix, opts));
            }
            const copyCompileCommands = this.ws.config.copyCompileCommands;
            if (copyCompileCommands) {
                this._copyCompileCommandsPath = util.lightNormalizePath(await expand.expandString(copyCompileCommands, opts));
            }
        });
    }
    /**
     * Path to where the root CMakeLists.txt file should be
     */
    get mainListFile() {
        const file = path.join(this.sourceDir, 'CMakeLists.txt');
        return util.lightNormalizePath(file);
    }
    /**
     * Directory where build output is stored.
     */
    get binaryDir() { return this._binaryDir; }
    /**
     * Directory where the targets will be installed.
     */
    get installDir() { return this._installDir; }
    /**
     * Path to copy compile_commands.json to
     */
    get copyCompileCommandsPath() { return this._copyCompileCommandsPath; }
    /**
     * @brief Get the path to the CMakeCache file in the build directory
     */
    get cachePath() {
        // TODO: Cache path can change if build dir changes at runtime
        const file = path.join(this.binaryDir, 'CMakeCache.txt');
        return util.lightNormalizePath(file);
    }
    /**
     * Get the current build type, according to the current selected variant.
     *
     * This is the value passed to CMAKE_BUILD_TYPE or --config for multiconf
     */
    get currentBuildType() { return this._variantBuildType; }
    get isMultiConf() { return this.generatorName ? util.isMultiConfGenerator(this.generatorName) : false; }
    get allTargetName() {
        const gen = this.generatorName;
        if (gen && (gen.includes('Visual Studio') || gen.toLowerCase().includes('xcode'))) {
            return 'ALL_BUILD';
        }
        else {
            return 'all';
        }
    }
    /**
     * The ID of the current compiler, as best we can tell
     */
    get compilerID() {
        const entries = this.cmakeCacheEntries;
        const languages = ['CXX', 'C', 'CUDA'];
        for (const lang of languages) {
            const entry = entries.get(`CMAKE_${lang}_COMPILER`);
            if (!entry) {
                continue;
            }
            const compiler = entry.value;
            if (compiler.endsWith('cl.exe')) {
                return 'MSVC';
            }
            else if (/g(cc|\+\+)/.test(compiler)) {
                return 'GNU';
            }
            else if (/clang(\+\+)?[^/]*/.test(compiler)) {
                return 'Clang';
            }
        }
        return null;
    }
    get linkerID() {
        const entries = this.cmakeCacheEntries;
        const entry = entries.get('CMAKE_LINKER');
        if (!entry) {
            return null;
        }
        const linker = entry.value;
        if (linker.endsWith('link.exe')) {
            return 'MSVC';
        }
        else if (linker.endsWith('ld')) {
            return 'GNU';
        }
        return null;
    }
    async testHaveCommand(program, args = ['--version']) {
        const child = this.executeCommand(program, args, undefined, { silent: true });
        try {
            const result = await child.result;
            return result.retc == 0;
        }
        catch (e) {
            const e2 = e;
            if (e2.code == 'ENOENT') {
                return false;
            }
            throw e;
        }
    }
    getPreferredGenerators() {
        const user_preferred = this.ws.config.preferredGenerators.map(g => ({ name: g }));
        if (this._kit && this._kit.preferredGenerator) {
            // The kit has a preferred generator attached as well
            user_preferred.push(this._kit.preferredGenerator);
        }
        return user_preferred;
    }
    /**
     * Picks the best generator to use on the current system
     */
    async getBestGenerator() {
        // User can override generator with a setting
        const user_generator = this.ws.config.generator;
        if (user_generator) {
            log.debug(`Using generator from user configuration: ${user_generator}`);
            return {
                name: user_generator,
                platform: this.ws.config.platform || undefined,
                toolset: this.ws.config.toolset || undefined,
            };
        }
        log.debug('Trying to detect generator supported by system');
        const platform = process.platform;
        const candidates = this.getPreferredGenerators();
        for (const gen of candidates) {
            const gen_name = gen.name;
            const generator_present = await (async () => {
                if (gen_name == 'Ninja') {
                    return await this.testHaveCommand('ninja') || this.testHaveCommand('ninja-build');
                }
                if (gen_name == 'MinGW Makefiles') {
                    return platform === 'win32' && this.testHaveCommand('mingw32-make');
                }
                if (gen_name == 'NMake Makefiles') {
                    return platform === 'win32' && this.testHaveCommand('nmake', ['/?']);
                }
                if (gen_name == 'Unix Makefiles') {
                    return this.testHaveCommand('make');
                }
                return false;
            })();
            if (!generator_present) {
                const vsMatch = /^(Visual Studio \d{2} \d{4})($|\sWin64$|\sARM$)/.exec(gen.name);
                if (platform === 'win32' && vsMatch) {
                    return {
                        name: vsMatch[1],
                        platform: gen.platform || vsMatch[2],
                        toolset: gen.toolset,
                    };
                }
                if (gen.name.toLowerCase().startsWith('xcode') && platform === 'darwin') {
                    return gen;
                }
                continue;
            }
            else {
                return gen;
            }
        }
        return null;
    }
    async configure(extra_args, consumer) {
        log.debug('Start configure ', extra_args);
        const pre_check_ok = await this._beforeConfigureOrBuild();
        if (!pre_check_ok) {
            return -1;
        }
        const settings = Object.assign({}, this.ws.config.configureSettings);
        const _makeFlag = (key, cmval) => {
            switch (cmval.type) {
                case 'UNKNOWN':
                    return `-D${key}=${cmval.value}`;
                default:
                    return `-D${key}:${cmval.type}=${cmval.value}`;
            }
        };
        util.objectPairs(this._variantConfigureSettings).forEach(([key, value]) => settings[key] = value);
        if (this._variantLinkage !== null) {
            settings.BUILD_SHARED_LIBS = this._variantLinkage === 'shared';
        }
        // Always export so that we have compile_commands.json
        settings.CMAKE_EXPORT_COMPILE_COMMANDS = true;
        if (!this.isMultiConf) {
            // Mutliconf generators do not need the CMAKE_BUILD_TYPE property
            settings.CMAKE_BUILD_TYPE = this.currentBuildType;
        }
        // Only use the installPrefix config if the user didn't
        // provide one via configureSettings
        if (!settings.CMAKE_INSTALL_PREFIX && this.installDir) {
            await this._refreshExpansions();
            settings.CMAKE_INSTALL_PREFIX = this.installDir;
        }
        const settings_flags = util.objectPairs(settings).map(([key, value]) => _makeFlag(key, util.cmakeify(value)));
        const flags = ['--no-warn-unused-cli'].concat(extra_args, this.ws.config.configureArgs);
        console.assert(!!this._kit);
        if (!this._kit) {
            throw new Error('No kit is set!');
        }
        if (this._kit.compilers) {
            log.debug('Using compilers in', this._kit.name, 'for configure');
            flags.push(...util.objectPairs(this._kit.compilers).map(([lang, comp]) => `-DCMAKE_${lang}_COMPILER:FILEPATH=${comp}`));
        }
        if (this._kit.toolchainFile) {
            log.debug('Using CMake toolchain', this._kit.name, 'for configuring');
            flags.push(`-DCMAKE_TOOLCHAIN_FILE=${this._kit.toolchainFile}`);
        }
        if (this._kit.cmakeSettings) {
            flags.push(...util.objectPairs(this._kit.cmakeSettings).map(([key, val]) => _makeFlag(key, util.cmakeify(val))));
        }
        const cache_init_conf = this.ws.config.cacheInit;
        let cache_init = [];
        if (cache_init_conf === null) {
            // Do nothing
        }
        else if (typeof cache_init_conf === 'string') {
            cache_init = [cache_init_conf];
        }
        else {
            cache_init = cache_init_conf;
        }
        for (let init of cache_init) {
            if (!path.isAbsolute(init)) {
                init = path.join(this.sourceDir, init);
            }
            flags.push('-C', init);
        }
        // Get expanded configure environment
        const expanded_configure_env = await this.getConfigureEnvironment();
        // Expand all flags
        const final_flags = flags.concat(settings_flags);
        const opts = this.expansionOptions;
        const expanded_flags_promises = final_flags.map(async (value) => expand.expandString(value, Object.assign({}, opts, { envOverride: expanded_configure_env })));
        const expanded_flags = await Promise.all(expanded_flags_promises);
        log.trace('CMake flags are', JSON.stringify(expanded_flags));
        // Expand all important paths
        await this._refreshExpansions();
        const retc = await this.doConfigure(expanded_flags, consumer);
        return retc;
    }
    async build(target, consumer) {
        log.debug('Start build', target);
        const pre_build_ok = await this.doPreBuild();
        if (!pre_build_ok) {
            return -1;
        }
        const child = await this._doCMakeBuild(target, consumer);
        if (!child) {
            return -1;
        }
        const post_build_ok = await this.doPostBuild();
        if (!post_build_ok) {
            return -1;
        }
        await this._refreshExpansions();
        return (await child.result).retc;
    }
    /**
     * Execute pre-configure/build tasks to check if we are ready to run a full
     * configure. This should be called by a derived driver before any
     * configuration tasks are run
     */
    async _beforeConfigureOrBuild() {
        log.debug('Runnnig pre-configure checks and steps');
        if (this._isBusy) {
            if (this.ws.config.autoRestartBuild) {
                log.debug('Stopping current CMake task.');
                vscode.window.showInformationMessage('Stopping current CMake task and starting new build.');
                await this.stopCurrentProcess();
            }
            else {
                log.debug('No configuring: We\'re busy.');
                vscode.window.showErrorMessage('A CMake task is already running. Stop it before trying to configure.');
                return false;
            }
        }
        if (!this.sourceDir) {
            log.debug('No configuring: There is no source directory.');
            vscode.window.showErrorMessage('You do not have a source directory open');
            return false;
        }
        const cmake_list = this.mainListFile;
        if (!await pr_1.fs.exists(cmake_list)) {
            log.debug('No configuring: There is no ', cmake_list);
            const do_quickstart = await vscode.window.showErrorMessage('You do not have a CMakeLists.txt', 'Quickstart a new CMake project');
            if (do_quickstart)
                vscode.commands.executeCommand('cmake.quickStart');
            return false;
        }
        return true;
    }
    async _doCMakeBuild(target, consumer) {
        const ok = await this._beforeConfigureOrBuild();
        if (!ok) {
            return null;
        }
        const gen = this.generatorName;
        const generator_args = (() => {
            if (!gen)
                return [];
            else if (/(Unix|MinGW) Makefiles|Ninja/.test(gen) && target !== 'clean')
                return ['-j', this.ws.config.numJobs.toString()];
            else if (gen.includes('Visual Studio'))
                return [
                    '/m',
                    '/property:GenerateFullPaths=true',
                ]; // TODO: Older VS doesn't support these flags
            else
                return [];
        })();
        const build_env = {};
        build_env['NINJA_STATUS'] = '[%s/%t %p :: %e] ';
        const opts = this.expansionOptions;
        await Promise.resolve(util.objectPairs(util.mergeEnvironment(this.ws.config.buildEnvironment, await this.getExpandedEnvironment()))
            .forEach(async ([key, value]) => build_env[key] = await expand.expandString(value, opts)));
        const args = ['--build', this.binaryDir, '--config', this.currentBuildType, '--target', target]
            .concat(this.ws.config.buildArgs, ['--'], generator_args, this.ws.config.buildToolArgs);
        const expanded_args_promises = args.map(async (value) => expand.expandString(value, Object.assign({}, opts, { envOverride: build_env })));
        const expanded_args = await Promise.all(expanded_args_promises);
        log.trace('CMake build args are: ', JSON.stringify(expanded_args));
        const cmake = this.cmake.path;
        let outputEnc = this.ws.config.outputLogEncoding;
        if (outputEnc == 'auto') {
            if (process.platform === 'win32') {
                outputEnc = await codepages.getWindowsCodepage();
            }
            else {
                outputEnc = 'utf8';
            }
        }
        const exeOpt = { environment: build_env, outputEncoding: outputEnc };
        const child = this.executeCommand(cmake, expanded_args, consumer, exeOpt);
        this._currentProcess = child;
        this._isBusy = true;
        await child.result;
        this._isBusy = false;
        this._currentProcess = null;
        return child;
    }
    /**
     * Stops the currently running process at user request
     */
    async stopCurrentProcess() {
        const cur = this._currentProcess;
        if (!cur) {
            return false;
        }
        await util.termProc(cur.child);
        return true;
    }
    async _baseInit(kit) {
        if (kit) {
            // Load up kit environment before starting any drivers.
            await this._setKit(kit);
        }
        await this._refreshExpansions();
        await this.doInit();
    }
    /**
     * Asynchronous initialization. Should be called by base classes during
     * their initialization.
     */
    static async createDerived(inst, kit) {
        await inst._baseInit(kit);
        return inst;
    }
}
exports.CMakeDriver = CMakeDriver;
//# sourceMappingURL=driver.js.map