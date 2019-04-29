"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Root of the extension
 */
const cache_1 = require("@cmt/cache");
const cm_upgrade_1 = require("@cmt/cm-upgrade");
const cmake_executable_1 = require("@cmt/cmake/cmake-executable");
const compdb_1 = require("@cmt/compdb");
const debugger_mod = require("@cmt/debugger");
const collections_1 = require("@cmt/diagnostics/collections");
const shlex = require("@cmt/shlex");
const state_1 = require("@cmt/state");
const strand_1 = require("@cmt/strand");
const util_1 = require("@cmt/util");
const workspace_1 = require("@cmt/workspace");
const path = require("path");
const vscode = require("vscode");
const cms_client_1 = require("./cms-client");
const cms_driver_1 = require("./cms-driver");
const ctest_1 = require("./ctest");
const build_1 = require("./diagnostics/build");
const cmake_1 = require("./diagnostics/cmake");
const util_2 = require("./diagnostics/util");
const expand_1 = require("./expand");
const legacy_driver_1 = require("./legacy-driver");
const logging = require("./logging");
const nag_1 = require("./nag");
const pr_1 = require("./pr");
const prop_1 = require("./prop");
const rollbar_1 = require("./rollbar");
const util_3 = require("./util");
const variant_1 = require("./variant");
const open = require('open');
const log = logging.createLogger('main');
const BUILD_LOGGER = logging.createLogger('build');
const CMAKE_LOGGER = logging.createLogger('cmake');
var ConfigureType;
(function (ConfigureType) {
    ConfigureType[ConfigureType["Normal"] = 0] = "Normal";
    ConfigureType[ConfigureType["Clean"] = 1] = "Clean";
})(ConfigureType || (ConfigureType = {}));
/**
 * Class implementing the extension. It's all here!
 *
 * The class internally uses a two-phase initialization, since proper startup
 * requires asynchrony. To ensure proper initialization. The class must be
 * created via the `create` static method. This will run the two phases
 * internally and return a promise to the new instance. This ensures that the
 * class invariants are maintained at all times.
 *
 * Some fields also require two-phase init. Their first phase is in the first
 * phase of the CMakeTools init, ie. the constructor.
 *
 * The second phases of fields will be called by the second phase of the parent
 * class. See the `_init` private method for this initialization.
 */
class CMakeTools {
    /**
     * Construct a new instance. The instance isn't ready, and must be initalized.
     * @param extensionContext The extension context
     *
     * This is private. You must call `create` to get an instance.
     */
    constructor(extensionContext, workspaceContext) {
        this.extensionContext = extensionContext;
        this.workspaceContext = workspaceContext;
        this._nagManager = new nag_1.NagManager(this.extensionContext);
        this._nagUpgradeSubscription = this._nagManager.onCMakeLatestVersion(info => {
            this.getCMakeExecutable().then(async (cmake) => {
                if (!cmake.version) {
                    log.error('Failed to get version information for CMake during upgarde');
                    return;
                }
                await cm_upgrade_1.maybeUpgradeCMake(this.extensionContext, { currentVersion: cmake.version, available: info });
            }, e => { rollbar_1.default.exception('Error during CMake upgrade', e, info); });
        });
        this._statusMessage = new prop_1.Property('Initializing');
        this._targetName = new prop_1.Property('all');
        this._buildType = new prop_1.Property('Unconfigured');
        this._launchTargetName = new prop_1.Property(null);
        this._ctestEnabled = new prop_1.Property(false);
        this._testResults = new prop_1.Property(null);
        this._isBusy = new prop_1.Property(false);
        this._codeModel = new prop_1.Property(null);
        this._codeModelDriverSub = null;
        /**
         * The variant manager keeps track of build variants. Has two-phase init.
         */
        this._variantManager = new variant_1.VariantManager(this.workspaceContext.state, this.workspaceContext.config);
        /**
         * A strand to serialize operations with the CMake driver
         */
        this._driverStrand = new strand_1.Strand();
        /**
         * The object in charge of talking to CMake. It starts empty (null) because
         * we don't know what driver to use at the current time. The driver also has
         * two-phase init and a private constructor. The driver may be replaced at
         * any time by the user making changes to the workspace configuration.
         */
        this._cmakeDriver = Promise.resolve(null);
        this._onReconfiguredEmitter = new vscode.EventEmitter();
        this._onTargetChangedEmitter = new vscode.EventEmitter();
        this._activeKit = null;
        /**
         * The compilation database for this driver.
         */
        this._compilationDatabase = null;
        this._ctestController = new ctest_1.CTestDriver(this.workspaceContext);
        // Watch for the user closing our terminal
        this._termCloseSub = vscode.window.onDidCloseTerminal(term => {
            if (term === this._launchTerminal) {
                this._launchTerminal = undefined;
            }
        });
        // Handle the active kit changing. We want to do some updates and teardown
        log.debug('Constructing new CMakeTools instance');
    }
    // Events that effect the user-interface
    /**
     * The status of this backend
     */
    get statusMessage() { return this._statusMessage.value; }
    get onStatusMessageChanged() { return this._statusMessage.changeEvent; }
    /**
     * The current target to build.
     */
    get targetName() { return this._targetName.value; }
    get onTargetNameChanged() { return this._targetName.changeEvent; }
    /**
     * The current build type
     */
    get buildType() { return this._buildType.value; }
    get onBuildTypeChanged() { return this._buildType.changeEvent; }
    /**
     * The "launch target" (the target that will be run by debugging)
     */
    get launchTargetName() { return this._launchTargetName.value; }
    get onLaunchTargetNameChanged() { return this._launchTargetName.changeEvent; }
    /**
     * Whether CTest is enabled
     */
    get ctestEnabled() { return this._ctestEnabled.value; }
    get onCTestEnabledChanged() { return this._ctestEnabled.changeEvent; }
    /**
     * The current CTest results
     */
    get testResults() { return this._testResults.value; }
    get onTestResultsChanged() { return this._testResults.changeEvent; }
    /**
     * Whether the backend is busy running some task
     */
    get isBusy() { return this._isBusy.value; }
    get onIsBusyChanged() { return this._isBusy.changeEvent; }
    /**
     * Event fired when the code model from CMake is updated
     */
    get codeModel() { return this._codeModel.value; }
    get onCodeModelChanged() { return this._codeModel.changeEvent; }
    /**
     * The status bar manager. Has two-phase init.
     */
    // private readonly _statusBar_1: StatusBar = new StatusBar();
    /**
     * Dispose the extension
     */
    dispose() {
        log.debug('Disposing CMakeTools extension');
        this._nagUpgradeSubscription.dispose();
        this._nagManager.dispose();
        this._termCloseSub.dispose();
        if (this._launchTerminal)
            this._launchTerminal.dispose();
        rollbar_1.default.invokeAsync('Root dispose', () => this.asyncDispose());
    }
    /**
     * Dispose of the extension asynchronously.
     */
    async asyncDispose() {
        collections_1.default.reset();
        if (this._cmakeDriver) {
            const drv = await this._cmakeDriver;
            if (drv) {
                await drv.asyncDispose();
            }
        }
        for (const disp of [this._statusMessage,
            this._targetName,
            this._buildType,
            this._ctestEnabled,
            this._testResults,
            this._isBusy,
            this._variantManager,
            this._ctestController,
        ]) {
            disp.dispose();
        }
    }
    /**
     * Start up a new CMake driver and return it. This is so that the initialization
     * of the driver is atomic to those using it
     */
    async _startNewCMakeDriver(cmake) {
        const kit = this.activeKit;
        log.debug('Starting CMake driver');
        if (!cmake.isPresent) {
            throw new Error(`Bad CMake executable "${cmake.path}".`);
        }
        let drv;
        if (this.workspaceContext.config.useCMakeServer) {
            if (cmake.isServerModeSupported) {
                drv = await cms_driver_1.CMakeServerClientDriver.create(cmake, this.workspaceContext, kit);
            }
            else {
                log.warning(`CMake Server is not available with the current CMake executable. Please upgrade to CMake
            ${util_1.versionToString(cmake.minimalServerModeVersion)} or newer.`);
                drv = await legacy_driver_1.LegacyCMakeDriver.create(cmake, this.workspaceContext, kit);
            }
        }
        else {
            // We didn't start the server backend, so we'll use the legacy one
            try {
                this._statusMessage.set('Starting CMake Server...');
                drv = await legacy_driver_1.LegacyCMakeDriver.create(cmake, this.workspaceContext, kit);
            }
            finally {
                this._statusMessage.set('Ready');
            }
        }
        await drv.setVariantOptions(this._variantManager.activeVariantOptions);
        this._targetName.set(this.defaultBuildTarget || drv.allTargetName);
        await this._ctestController.reloadTests(drv);
        // All set up. Fulfill the driver promise.
        return drv;
    }
    /**
     * Event fired after CMake configure runs
     */
    get onReconfigured() { return this._onReconfiguredEmitter.event; }
    get reconfigured() { return this.onReconfigured; }
    get targetChangedEvent() { return this._onTargetChangedEmitter.event; }
    async executeCMakeCommand(args, options) {
        const drv = await this.getCMakeDriverInstance();
        if (drv) {
            return drv.executeCommand(drv.cmake.path, args, undefined, options).result;
        }
        else {
            throw new Error('Unable to execute cmake command, there is no valid cmake driver instance.');
        }
    }
    async execute(program, args, options) {
        const drv = await this.getCMakeDriverInstance();
        if (drv) {
            return drv.executeCommand(program, args, undefined, options).result;
        }
        else {
            throw new Error('Unable to execute program, there is no valid cmake driver instance.');
        }
    }
    /**
     * Reload/restarts the CMake Driver
     */
    // private async _reloadCMakeDriver() {
    //   log.debug('Reloading CMake driver');
    //   const drv = await this._cmakeDriver;
    //   log.debug('Diposing old CMake driver');
    //   await drv.asyncDispose();
    //   return this._cmakeDriver = this._startNewCMakeDriver();
    // }
    /**
     * Second phase of two-phase init. Called by `create`.
     */
    async _init() {
        log.debug('Starting CMakeTools second-phase init');
        // First, start up Rollbar
        await rollbar_1.default.requestPermissions(this.extensionContext);
        // Start up the variant manager
        await this._variantManager.initialize();
        // Set the status bar message
        this._buildType.set(this._variantManager.activeVariantOptions.short);
        // Restore the debug target
        this._launchTargetName.set(this.workspaceContext.state.launchTargetName || '');
        // Hook up event handlers
        // Listen for the variant to change
        this._variantManager.onActiveVariantChanged(() => {
            log.debug('Active build variant changed');
            rollbar_1.default.invokeAsync('Changing build variant', async () => {
                const drv = await this.getCMakeDriverInstance();
                if (drv) {
                    await drv.setVariantOptions(this._variantManager.activeVariantOptions);
                    this._buildType.set(this._variantManager.activeVariantOptions.short);
                    // We don't configure yet, since someone else might be in the middle of a configure
                }
            });
        });
        this._ctestController.onTestingEnabledChanged(enabled => { this._ctestEnabled.set(enabled); });
        this._ctestController.onResultsChanged(res => { this._testResults.set(res); });
        this._statusMessage.set('Ready');
        // Additional, non-extension: Start up nagging.
        this._nagManager.start();
    }
    async setKit(kit) {
        this._activeKit = kit;
        if (kit) {
            log.debug('Injecting new Kit into CMake driver');
            const drv = await this._cmakeDriver;
            if (drv) {
                try {
                    this._statusMessage.set('Reloading...');
                    await drv.setKit(kit);
                }
                finally {
                    this._statusMessage.set('Ready');
                }
            }
            this.workspaceContext.state.activeKitName = kit.name;
        }
    }
    async getCMakeExecutable() {
        let cmakePath = await this.workspaceContext.cmakePath;
        if (cmakePath === null)
            cmakePath = '';
        return cmake_executable_1.getCMakeExecutableInformation(cmakePath);
    }
    /**
     * Returns, if possible a cmake driver instance. To creation the driver instance,
     * there are preconditions that should be fulfilled, such as an active kit is selected.
     * These preconditions are checked before it driver instance creation. When creating a
     * driver instance, this function waits until the driver is ready before returning.
     * This ensures that user commands can always be executed, because error criterials like
     * exceptions would assign a null driver and it is possible to create a new driver instance later again.
     */
    async getCMakeDriverInstance() {
        return this._driverStrand.execute(async () => {
            if (!this.activeKit) {
                log.debug('Not starting CMake driver: no kits defined');
                return null;
            }
            const cmake = await this.getCMakeExecutable();
            if (!cmake.isPresent) {
                vscode.window.showErrorMessage(`Bad CMake executable "${cmake.path}". Is it installed or settings contain the correct path (cmake.cmakePath)?`);
                return null;
            }
            if ((await this._cmakeDriver) === null) {
                log.debug('Starting new CMake driver');
                this._cmakeDriver = this._startNewCMakeDriver(cmake);
                try {
                    await this._cmakeDriver;
                }
                catch (e) {
                    this._cmakeDriver = Promise.resolve(null);
                    if (e instanceof cms_client_1.BadHomeDirectoryError) {
                        vscode.window
                            .showErrorMessage(`The source directory "${e.expecting}" does not match ` +
                            `the source directory in the CMake cache: ${e.cached}. ` +
                            `You will need to run a clean-configure to configure this project.`, {}, { title: 'Clean Configure' })
                            .then(chosen => {
                            if (chosen) {
                                // There was only one choice: to clean-configure
                                rollbar_1.default.invokeAsync('Clean reconfigure after bad home dir', async () => {
                                    try {
                                        await pr_1.fs.unlink(e.badCachePath);
                                    }
                                    catch (e2) {
                                        log.error('Failed to remove bad cache file: ', e.badCachePath, e2);
                                    }
                                    try {
                                        await pr_1.fs.rmdir(path.join(path.dirname(e.badCachePath), 'CMakeFiles'));
                                    }
                                    catch (e2) {
                                        log.error('Failed to remove CMakeFiles for cache: ', e.badCachePath, e2);
                                    }
                                    await this.cleanConfigure();
                                });
                            }
                        });
                    }
                    else if (e instanceof cms_client_1.NoGeneratorError) {
                        vscode.window.showErrorMessage(`Unable to determine what CMake generator to use. ` +
                            `Please install or configure a preferred generator, or update settings.json or your Kit configuration.`);
                    }
                    else {
                        throw e;
                    }
                    return null;
                }
                if (this._codeModelDriverSub) {
                    this._codeModelDriverSub.dispose();
                }
                const drv = await this._cmakeDriver;
                console.assert(drv !== null, 'Null driver immediately after creation?');
                if (drv instanceof cms_driver_1.CMakeServerClientDriver) {
                    this._codeModelDriverSub = drv.onCodeModelChanged(cm => { this._codeModel.set(cm); });
                }
            }
            return this._cmakeDriver;
        });
    }
    /**
     * Create an instance asynchronously
     * @param ctx The extension context
     *
     * The purpose of making this the only way to create an instance is to prevent
     * us from creating uninitialized instances of the CMake Tools extension.
     */
    static async create(ctx, wsc) {
        log.debug('Safe constructing new CMakeTools instance');
        const inst = new CMakeTools(ctx, wsc);
        await inst._init();
        log.debug('CMakeTools instance initialization complete.');
        return inst;
    }
    /**
     * Create a new CMakeTools for the given directory.
     * @param dirPath Path to the directory for which to create
     * @param ext The extension context
     */
    static async createForDirectory(dirPath, ext) {
        // Create a context for the directory
        const dir_ctx = workspace_1.DirectoryContext.createForDirectory(dirPath, new state_1.StateManager(ext));
        return CMakeTools.create(ext, dir_ctx);
    }
    /**
     * Implementation of `cmake.viewLog`
     */
    async viewLog() { await logging.showLogFile(); }
    get activeKit() { return this._activeKit; }
    async _refreshCompileDatabase(opts) {
        const compdb_path = path.join(await this.binaryDir, 'compile_commands.json');
        if (await pr_1.fs.exists(compdb_path)) {
            // Read the compilation database, and update our db property
            const new_db = await compdb_1.CompilationDatabase.fromFilePath(compdb_path);
            this._compilationDatabase = new_db;
            // Now try to copy the compdb to the user-requested path
            const copy_dest = this.workspaceContext.config.copyCompileCommands;
            if (!copy_dest) {
                return;
            }
            const expanded_dest = await expand_1.expandString(copy_dest, opts);
            const pardir = path.dirname(expanded_dest);
            try {
                await pr_1.fs.mkdir_p(pardir);
            }
            catch (e) {
                vscode.window.showErrorMessage(`Tried to copy "${compdb_path}" to "${expanded_dest}", but failed to create ` +
                    `the parent directory "${pardir}": ${e}`);
                return;
            }
            try {
                await pr_1.fs.copyFile(compdb_path, expanded_dest);
            }
            catch (e) {
                // Just display the error. It's the best we can do.
                vscode.window.showErrorMessage(`Failed to copy "${compdb_path}" to "${expanded_dest}": ${e}`);
                return;
            }
        }
    }
    /**
     * Implementation of `cmake.configure`
     */
    configure(extra_args = [], type = ConfigureType.Normal) {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Configuring project',
        }, async (progress) => {
            progress.report({ message: 'Preparing to configure' });
            log.debug('Run configure ', extra_args);
            return this._doConfigure(progress, async (consumer) => {
                const drv = await this.getCMakeDriverInstance();
                if (drv) {
                    let old_prog = 0;
                    const prog_sub = drv.onProgress(pr => {
                        const new_prog = 100 * (pr.progressCurrent - pr.progressMinimum) / (pr.progressMaximum - pr.progressMinimum);
                        const increment = new_prog - old_prog;
                        if (increment >= 1) {
                            old_prog += increment;
                            progress.report({ increment });
                        }
                    });
                    try {
                        progress.report({ message: 'Configuring project' });
                        let retc;
                        switch (type) {
                            case ConfigureType.Normal:
                                retc = await drv.configure(extra_args, consumer);
                                break;
                            case ConfigureType.Clean:
                                retc = await drv.cleanConfigure(consumer);
                                break;
                            default:
                                rollbar_1.default.error('Unexpected configure type', { type });
                                retc = await this.configure(extra_args, ConfigureType.Normal);
                                break;
                        }
                        if (retc === 0) {
                            await this._refreshCompileDatabase(drv.expansionOptions);
                        }
                        this._onReconfiguredEmitter.fire();
                        return retc;
                    }
                    finally {
                        progress.report({ message: 'Finishing configure' });
                        prog_sub.dispose();
                    }
                }
                else {
                    return -1;
                }
            });
        });
    }
    /**
     * Implementation of `cmake.cleanConfigure()
     */
    cleanConfigure() { return this.configure([], ConfigureType.Clean); }
    /**
     * Save all open files. "maybe" because the user may have disabled auto-saving
     * with `config.saveBeforeBuild`.
     */
    async maybeAutoSaveAll() {
        // Save open files before we configure/build
        if (this.workspaceContext.config.saveBeforeBuild) {
            log.debug('Saving open files before configure/build');
            const save_good = await vscode.workspace.saveAll();
            if (!save_good) {
                log.debug('Saving open files failed');
                const chosen = await vscode.window.showErrorMessage('Not all open documents were saved. Would you like to continue anyway?', {
                    title: 'Yes',
                    isCloseAffordance: false,
                }, {
                    title: 'No',
                    isCloseAffordance: true,
                });
                return chosen !== undefined && (chosen.title === 'Yes');
            }
        }
        return true;
    }
    /**
     * Wraps pre/post configure logic around an actual configure function
     * @param cb The actual configure callback. Called to do the configure
     */
    async _doConfigure(progress, cb) {
        progress.report({ message: 'Saving open files' });
        if (!await this.maybeAutoSaveAll()) {
            return -1;
        }
        if (!this.activeKit) {
            throw new Error('Cannot configure: No kit is active for this CMake Tools');
        }
        if (!this._variantManager.haveVariant) {
            progress.report({ message: 'Waiting on variant selection' });
            await this._variantManager.selectVariant();
            if (!this._variantManager.haveVariant) {
                log.debug('No variant selected. Abort configure');
                return -1;
            }
        }
        if (this.workspaceContext.config.clearOutputBeforeBuild) {
            log.clearOutputChannel();
        }
        log.showChannel();
        const consumer = new cmake_1.CMakeOutputConsumer(await this.sourceDir, CMAKE_LOGGER);
        const retc = await cb(consumer);
        util_2.populateCollection(collections_1.default.cmake, consumer.diagnostics);
        return retc;
    }
    /**
     * Get the name of the "all" target; that is, the target name for which CMake
     * will build all default targets.
     *
     * This is required because simply using `all` as the target name is incorrect
     * for some generators, such as Visual Studio and Xcode.
     *
     * This is async because it depends on checking the active generator name
     */
    get allTargetName() { return this._allTargetName(); }
    async _allTargetName() {
        const drv = await this.getCMakeDriverInstance();
        if (drv) {
            return drv.allTargetName;
        }
        else {
            return '';
        }
    }
    /**
     * Check if the current project needs to be (re)configured
     */
    async _needsReconfigure() {
        const drv = await this.getCMakeDriverInstance();
        if (!drv || await drv.checkNeedsReconfigure()) {
            return true;
        }
        else {
            return false;
        }
    }
    async ensureConfigured() {
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            return null;
        }
        // First, save open files
        if (!await this.maybeAutoSaveAll()) {
            return -1;
        }
        if (await drv.checkNeedsReconfigure()) {
            log.clearOutputChannel();
            return this.configure();
        }
        else {
            return null;
        }
    }
    /**
     * Implementation of `cmake.build`
     */
    async build(target_) {
        log.debug('Run build', target_ ? target_ : '');
        const config_retc = await this.ensureConfigured();
        if (config_retc === null) {
            // Already configured. Clear console
            log.clearOutputChannel();
        }
        else if (config_retc !== 0) {
            return config_retc;
        }
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            throw new Error('Impossible: CMake driver died immediately after successful configure');
        }
        const target = target_ ? target_ : this.workspaceContext.state.defaultBuildTarget || await this.allTargetName;
        const consumer = new build_1.CMakeBuildConsumer(BUILD_LOGGER);
        const IS_BUILDING_KEY = 'cmake:isBuilding';
        try {
            this._statusMessage.set('Building');
            this._isBusy.set(true);
            return await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Building: ${target}`,
                cancellable: true,
            }, async (progress, cancel) => {
                let old_progress = 0;
                consumer.onProgress(pr => {
                    const increment = pr.value - old_progress;
                    if (increment >= 1) {
                        progress.report({ increment });
                        old_progress += increment;
                    }
                });
                cancel.onCancellationRequested(() => { rollbar_1.default.invokeAsync('Stop on cancellaction', () => this.stop()); });
                log.showChannel();
                BUILD_LOGGER.info('Starting build');
                await util_3.setContextValue(IS_BUILDING_KEY, true);
                const rc = await drv.build(target, consumer);
                await util_3.setContextValue(IS_BUILDING_KEY, false);
                if (rc === null) {
                    BUILD_LOGGER.info('Build was terminated');
                }
                else {
                    BUILD_LOGGER.info('Build finished with exit code', rc);
                }
                const file_diags = consumer.compileConsumer.resolveDiagnostics(drv.binaryDir);
                util_2.populateCollection(collections_1.default.build, file_diags);
                return rc === null ? -1 : rc;
            });
        }
        finally {
            await util_3.setContextValue(IS_BUILDING_KEY, false);
            this._statusMessage.set('Ready');
            this._isBusy.set(false);
            consumer.dispose();
        }
    }
    /**
     * Attempt to execute the compile command associated with the file. If it
     * fails for _any reason_, returns `null`. Otherwise returns the terminal in
     * which the compilation is running
     * @param filePath The path to a file to try and compile
     */
    async tryCompileFile(filePath) {
        const config_retc = await this.ensureConfigured();
        if (config_retc !== null && config_retc !== 0) {
            // Config failed?
            return null;
        }
        if (!this._compilationDatabase) {
            return null;
        }
        const cmd = this._compilationDatabase.get(filePath);
        if (!cmd) {
            return null;
        }
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            return null;
        }
        return drv.runCompileCommand(cmd);
    }
    async editCache() {
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            vscode.window.showErrorMessage('Set up your CMake project before trying to edit the cache.');
            return;
        }
        if (!await pr_1.fs.exists(drv.cachePath)) {
            const do_conf = !!(await vscode.window.showErrorMessage('This project has not yet been configured', 'Configure Now'));
            if (do_conf) {
                if (await this.configure() !== 0)
                    return;
            }
            else {
                return;
            }
        }
        await vscode.commands.executeCommand('vscode.previewHtml', 'cmake-cache://' + drv.cachePath, vscode.ViewColumn.Three, 'CMake Cache');
    }
    async buildWithTarget() {
        const target = await this.showTargetSelector();
        if (target === null)
            return -1;
        return this.build(target);
    }
    async showTargetSelector() {
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            vscode.window.showErrorMessage('Set up your CMake project before selecting a target.');
            return '';
        }
        if (!drv.targets.length) {
            return (await vscode.window.showInputBox({ prompt: 'Enter a target name' })) || null;
        }
        else {
            const choices = drv.targets.map((t) => {
                switch (t.type) {
                    case 'named': {
                        return {
                            label: t.name,
                            description: 'Target to build',
                        };
                    }
                    case 'rich': {
                        return { label: t.name, description: t.targetType, detail: t.filepath };
                    }
                }
            });
            const sel = await vscode.window.showQuickPick(choices);
            return sel ? sel.label : null;
        }
    }
    /**
     * Implementaiton of `cmake.clean`
     */
    async clean() { return this.build('clean'); }
    /**
     * Implementation of `cmake.cleanRebuild`
     */
    async cleanRebuild() {
        const clean_res = await this.clean();
        if (clean_res !== 0)
            return clean_res;
        return this.build();
    }
    async ctest() {
        const build_retc = await this.build();
        if (build_retc !== 0) {
            return build_retc;
        }
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            throw new Error('Impossible: CMake driver died immediately after build succeeded.');
        }
        return this._ctestController.runCTest(drv);
    }
    /**
     * Implementation of `cmake.install`
     */
    async install() { return this.build('install'); }
    /**
     * Implementation of `cmake.stop`
     */
    async stop() {
        const drv = await this._cmakeDriver;
        if (!drv) {
            return false;
        }
        return drv.stopCurrentProcess().then(() => {
            this._cmakeDriver = Promise.resolve(null);
            return true;
        }, () => false);
    }
    /**
     * Implementation of `cmake.setVariant`
     */
    async setVariant() {
        const ret = await this._variantManager.selectVariant();
        if (ret) {
            await this.configure();
        }
        return ret;
    }
    /**
     * The target that will be built with a regular build invocation
     */
    get defaultBuildTarget() { return this.workspaceContext.state.defaultBuildTarget; }
    async _setDefaultBuildTarget(v) {
        this.workspaceContext.state.defaultBuildTarget = v;
        this._targetName.set(v);
    }
    /**
     * Set the default target to build. Implementation of `cmake.setDefaultTarget`
     * @param target If specified, set this target instead of asking the user
     */
    async setDefaultTarget(target) {
        if (!target) {
            target = await this.showTargetSelector();
        }
        if (!target) {
            return;
        }
        await this._setDefaultBuildTarget(target);
    }
    /**
     * Implementation of `cmake.selectLaunchTarget`
     */
    async selectLaunchTarget(name) { return this.setLaunchTargetByName(name); }
    /**
     * Used by vscode and as test interface
     */
    async setLaunchTargetByName(name) {
        if (await this._needsReconfigure()) {
            const rc = await this.configure();
            if (rc !== 0) {
                return null;
            }
        }
        const executableTargets = await this.executableTargets;
        if (executableTargets.length === 0) {
            return null;
        }
        const choices = executableTargets.map(e => ({
            label: e.name,
            description: '',
            detail: e.path,
        }));
        let chosen = undefined;
        if (!name) {
            chosen = await vscode.window.showQuickPick(choices);
        }
        else {
            chosen = choices.find(choice => choice.label == name);
        }
        if (!chosen) {
            return null;
        }
        this.workspaceContext.state.launchTargetName = chosen.label;
        this._launchTargetName.set(chosen.label);
        return chosen.detail;
    }
    async getCurrentLaunchTarget() {
        const target_name = this.workspaceContext.state.launchTargetName;
        const target = (await this.executableTargets).find(e => e.name == target_name);
        if (!target) {
            return null;
        }
        return target;
    }
    /**
     * Implementation of `cmake.launchTargetPath`
     */
    async launchTargetPath() {
        const executable = await this.prepareLaunchTargetExecutable();
        if (!executable) {
            log.showChannel();
            log.warning('=======================================================');
            log.warning('No executable target was found to launch. Please check:');
            log.warning(' - Have you called add_executable() in your CMake project?');
            log.warning(' - Have you executed a successful CMake configure? ');
            log.warning('No program will be executed');
            return null;
        }
        return executable.path;
    }
    async prepareLaunchTargetExecutable(name) {
        let chosen;
        if (name) {
            const found = (await this.executableTargets).find(e => e.name === name);
            if (!found) {
                return null;
            }
            chosen = found;
        }
        else {
            const current = await this.getOrSelectLaunchTarget();
            if (!current) {
                return null;
            }
            chosen = current;
        }
        // Ensure that we've configured the project already. If we haven't, `getOrSelectLaunchTarget` won't see any
        // executable targets and may show an uneccessary prompt to the user
        const isReconfigurationNeeded = await this._needsReconfigure();
        if (isReconfigurationNeeded) {
            const rc = await this.configure();
            if (rc !== 0) {
                log.debug('Configuration of project failed.');
                return null;
            }
        }
        const buildOnLaunch = this.workspaceContext.config.buildBeforeRun;
        if (buildOnLaunch || isReconfigurationNeeded) {
            const rc_build = await this.build(chosen.name);
            if (rc_build !== 0) {
                log.debug('Build failed');
                return null;
            }
        }
        return chosen;
    }
    async getOrSelectLaunchTarget() {
        const current = await this.getCurrentLaunchTarget();
        if (current) {
            return current;
        }
        // Ask the user if we don't already have a target
        await this.selectLaunchTarget();
        return this.getCurrentLaunchTarget();
    }
    /**
     * Implementation of `cmake.debugTarget`
     */
    async debugTarget(name) {
        const drv = await this.getCMakeDriverInstance();
        if (!drv) {
            vscode.window.showErrorMessage('Set up and build your CMake project before debugging.');
            return null;
        }
        if (drv instanceof legacy_driver_1.LegacyCMakeDriver) {
            vscode.window
                .showWarningMessage('Target debugging is no longer supported with the legacy driver', {
                title: 'Learn more',
                isLearnMore: true,
            })
                .then(item => {
                if (item && item.isLearnMore) {
                    open('https://vector-of-bool.github.io/docs/vscode-cmake-tools/debugging.html');
                }
            });
            return null;
        }
        const targetExecutable = await this.prepareLaunchTargetExecutable(name);
        if (!targetExecutable) {
            log.error(`Failed to prepare executable target with name '${name}'`);
            return null;
        }
        let debug_config;
        try {
            const cache = await cache_1.CMakeCache.fromPath(drv.cachePath);
            debug_config = await debugger_mod.getDebugConfigurationFromCache(cache, targetExecutable, process.platform);
            log.debug('Debug configuration from cache: ', JSON.stringify(debug_config));
        }
        catch (error) {
            vscode.window
                .showErrorMessage(error.message, {
                title: 'Debugging documentation',
                isLearnMore: true,
            })
                .then(item => {
                if (item && item.isLearnMore) {
                    open('https://vector-of-bool.github.io/docs/vscode-cmake-tools/debugging.html');
                }
            });
            log.debug('Problem to get debug from cache.', error);
            return null;
        }
        if (debug_config === null) {
            log.error('Failed to generate debugger configuration');
            vscode.window.showErrorMessage('Unable to generate a debugging configuration.');
            return null;
        }
        // add debug configuration from settings
        const user_config = this.workspaceContext.config.debugConfig;
        Object.assign(debug_config, user_config);
        log.debug('Starting debugger with following configuration.', JSON.stringify({
            workspace: vscode.workspace.workspaceFolders[0].uri.toString(),
            config: debug_config,
        }));
        await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debug_config);
        return vscode.debug.activeDebugSession;
    }
    /**
     * Implementation of `cmake.launchTarget`
     */
    async launchTarget(name) {
        const executable = await this.prepareLaunchTargetExecutable(name);
        if (!executable) {
            // The user has nothing selected and cancelled the prompt to select
            // a target.
            return null;
        }
        const termOptions = {
            name: 'CMake/Launch',
        };
        if (process.platform == 'win32') {
            // Use cmd.exe on Windows
            termOptions.shellPath = 'C:/Windows/System32/cmd.exe';
        }
        if (!this._launchTerminal)
            this._launchTerminal = vscode.window.createTerminal(termOptions);
        const quoted = shlex.quote(executable.path);
        this._launchTerminal.sendText(quoted);
        this._launchTerminal.show();
        return this._launchTerminal;
    }
    /**
     * Implementation of `cmake.quickStart`
     */
    async quickStart() {
        if (vscode.workspace.workspaceFolders === undefined) {
            vscode.window.showErrorMessage('No folder is open.');
            return -2;
        }
        const sourceDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const mainListFile = path.join(sourceDir, 'CMakeLists.txt');
        if (await pr_1.fs.exists(mainListFile)) {
            vscode.window.showErrorMessage('This workspace already contains a CMakeLists.txt!');
            return -1;
        }
        const project_name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the new project',
            validateInput: (value) => {
                if (!value.length)
                    return 'A project name is required';
                return '';
            },
        });
        if (!project_name)
            return -1;
        const target_type = (await vscode.window.showQuickPick([
            {
                label: 'Library',
                description: 'Create a library',
            },
            { label: 'Executable', description: 'Create an executable' }
        ]));
        if (!target_type)
            return -1;
        const type = target_type.label;
        const init = [
            'cmake_minimum_required(VERSION 3.0.0)',
            `project(${project_name} VERSION 0.1.0)`,
            '',
            'include(CTest)',
            'enable_testing()',
            '',
            type == 'Library' ? `add_library(${project_name} ${project_name}.cpp)`
                : `add_executable(${project_name} main.cpp)`,
            '',
            'set(CPACK_PROJECT_NAME ${PROJECT_NAME})',
            'set(CPACK_PROJECT_VERSION ${PROJECT_VERSION})',
            'include(CPack)',
            '',
        ].join('\n');
        if (type === 'Library') {
            if (!(await pr_1.fs.exists(path.join(sourceDir, project_name + '.cpp')))) {
                await pr_1.fs.writeFile(path.join(sourceDir, project_name + '.cpp'), [
                    '#include <iostream>',
                    '',
                    'void say_hello(){',
                    `    std::cout << "Hello, from ${project_name}!\\n";`,
                    '}',
                    '',
                ].join('\n'));
            }
        }
        else {
            if (!(await pr_1.fs.exists(path.join(sourceDir, 'main.cpp')))) {
                await pr_1.fs.writeFile(path.join(sourceDir, 'main.cpp'), [
                    '#include <iostream>',
                    '',
                    'int main(int, char**) {',
                    '    std::cout << "Hello, world!\\n";',
                    '}',
                    '',
                ].join('\n'));
            }
        }
        await pr_1.fs.writeFile(mainListFile, init);
        const doc = await vscode.workspace.openTextDocument(mainListFile);
        await vscode.window.showTextDocument(doc);
        return this.configure();
    }
    /**
     * Implementation of `cmake.resetState`
     */
    async resetState() {
        this.workspaceContext.state.reset();
        vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
    get sourceDir() {
        const drv = this.getCMakeDriverInstance();
        return drv.then(d => {
            if (!d) {
                return '';
            }
            return d.sourceDir;
        });
    }
    get mainListFile() {
        const drv = this.getCMakeDriverInstance();
        return drv.then(d => {
            if (!d) {
                return '';
            }
            return d.mainListFile;
        });
    }
    get binaryDir() {
        const drv = this.getCMakeDriverInstance();
        return drv.then(d => {
            if (!d) {
                return '';
            }
            return d.binaryDir;
        });
    }
    get cachePath() {
        const drv = this.getCMakeDriverInstance();
        return drv.then(d => {
            if (!d) {
                return '';
            }
            return d.cachePath;
        });
    }
    get targets() {
        const drv = this.getCMakeDriverInstance();
        return drv.then(d => {
            if (!d) {
                return [];
            }
            return d.targets;
        });
    }
    get executableTargets() {
        const drv = this.getCMakeDriverInstance();
        return drv.then(d => {
            if (!d) {
                return [];
            }
            return d.executableTargets;
        });
    }
    async jumpToCacheFile() {
        // Do nothing.
        return null;
    }
    async setBuildType() {
        // Do nothing
        return -1;
    }
    async selectEnvironments() { return null; }
}
exports.CMakeTools = CMakeTools;
exports.default = CMakeTools;
//# sourceMappingURL=cmake-tools.js.map