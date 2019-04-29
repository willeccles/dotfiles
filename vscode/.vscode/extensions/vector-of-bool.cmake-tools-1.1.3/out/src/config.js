"use strict";
/**
 * Provides a typed interface to CMake Tools' configuration options. You'll want
 * to import the `config` default export, which is an instance of the
 * `ConfigurationReader` class.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("@cmt/util");
const os = require("os");
const vscode = require("vscode");
/**
 * This class exposes a number of readonly properties which can be used to
 * access configuration options. Each property corresponds to a value in
 * `settings.json`. See `package.json` for CMake Tools to see the information
 * on each property. An underscore in a property name corresponds to a dot `.`
 * in the setting name.
 */
class ConfigurationReader {
    constructor(_configData) {
        this._configData = _configData;
        this._emitters = {
            cmakePath: new vscode.EventEmitter(),
            buildDirectory: new vscode.EventEmitter(),
            installPrefix: new vscode.EventEmitter(),
            sourceDirectory: new vscode.EventEmitter(),
            saveBeforeBuild: new vscode.EventEmitter(),
            buildBeforeRun: new vscode.EventEmitter(),
            clearOutputBeforeBuild: new vscode.EventEmitter(),
            configureSettings: new vscode.EventEmitter(),
            cacheInit: new vscode.EventEmitter(),
            preferredGenerators: new vscode.EventEmitter(),
            generator: new vscode.EventEmitter(),
            toolset: new vscode.EventEmitter(),
            platform: new vscode.EventEmitter(),
            configureArgs: new vscode.EventEmitter(),
            buildArgs: new vscode.EventEmitter(),
            buildToolArgs: new vscode.EventEmitter(),
            parallelJobs: new vscode.EventEmitter(),
            ctestPath: new vscode.EventEmitter(),
            ctest: new vscode.EventEmitter(),
            autoRestartBuild: new vscode.EventEmitter(),
            parseBuildDiagnostics: new vscode.EventEmitter(),
            enabledOutputParsers: new vscode.EventEmitter(),
            debugConfig: new vscode.EventEmitter(),
            defaultVariants: new vscode.EventEmitter(),
            ctestArgs: new vscode.EventEmitter(),
            environment: new vscode.EventEmitter(),
            configureEnvironment: new vscode.EventEmitter(),
            buildEnvironment: new vscode.EventEmitter(),
            testEnvironment: new vscode.EventEmitter(),
            mingwSearchDirs: new vscode.EventEmitter(),
            emscriptenSearchDirs: new vscode.EventEmitter(),
            copyCompileCommands: new vscode.EventEmitter(),
            configureOnOpen: new vscode.EventEmitter(),
            useCMakeServer: new vscode.EventEmitter(),
            outputLogEncoding: new vscode.EventEmitter(),
            enableTraceLogging: new vscode.EventEmitter(),
            loggingLevel: new vscode.EventEmitter(),
        };
    }
    get configData() { return this._configData; }
    dispose() {
        if (this._updateSubscription) {
            this._updateSubscription.dispose();
        }
    }
    /**
     * Get a configuration object relevant to the given workspace directory. This
     * supports multiple workspaces having differing configs.
     *
     * @param workspacePath A directory to use for the config
     */
    static createForDirectory(dirPath) {
        const data = ConfigurationReader.loadForPath(dirPath);
        const reader = new ConfigurationReader(data);
        reader._updateSubscription = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('cmake', vscode.Uri.file(dirPath))) {
                const new_data = ConfigurationReader.loadForPath(dirPath);
                reader.update(new_data);
            }
        });
        return reader;
    }
    static loadForPath(filePath) {
        const data = vscode.workspace.getConfiguration('cmake', vscode.Uri.file(filePath));
        const platmap = {
            win32: 'windows',
            darwin: 'osx',
            linux: 'linux',
        };
        const platform = platmap[process.platform];
        const for_platform = data[platform];
        return Object.assign({}, data, (for_platform || {}));
    }
    update(newData) { this.updatePartial(newData); }
    updatePartial(newData) {
        const old_values = Object.assign({}, this.configData);
        Object.assign(this.configData, newData);
        for (const key_ of Object.getOwnPropertyNames(newData)) {
            const key = key_;
            if (!(key in this._emitters)) {
                continue; // Extension config we load has some additional properties we don't care about.
            }
            const new_value = this.configData[key];
            const old_value = old_values[key];
            if (util.compare(new_value, old_value) !== util.Ordering.Equivalent) {
                const em = this._emitters[key];
                em.fire(newData[key]);
            }
        }
    }
    get buildDirectory() { return this.configData.buildDirectory; }
    get installPrefix() { return this.configData.installPrefix; }
    get sourceDirectory() { return this.configData.sourceDirectory; }
    get saveBeforeBuild() { return !!this.configData.saveBeforeBuild; }
    get buildBeforeRun() { return this.configData.buildBeforeRun; }
    get clearOutputBeforeBuild() { return !!this.configData.clearOutputBeforeBuild; }
    get autoRestartBuild() { return !!this.configData.autoRestartBuild; }
    get configureSettings() { return this.configData.configureSettings; }
    get cacheInit() { return this.configData.cacheInit; }
    get preferredGenerators() { return this.configData.preferredGenerators; }
    get generator() { return this.configData.generator; }
    get toolset() { return this.configData.toolset; }
    get platform() { return this.configData.platform; }
    get configureArgs() { return this.configData.configureArgs; }
    get buildArgs() { return this.configData.buildArgs; }
    get buildToolArgs() { return this.configData.buildToolArgs; }
    get parallelJobs() { return this.configData.parallelJobs; }
    get ctest_parallelJobs() { return this.configData.ctest.parallelJobs; }
    get parseBuildDiagnostics() { return !!this.configData.parseBuildDiagnostics; }
    get enableOutputParsers() { return this.configData.enabledOutputParsers; }
    get raw_cmakePath() { return this.configData.cmakePath; }
    get raw_ctestPath() { return this.configData.ctestPath; }
    get debugConfig() { return this.configData.debugConfig; }
    get environment() { return this.configData.environment; }
    get configureEnvironment() { return this.configData.configureEnvironment; }
    get buildEnvironment() { return this.configData.buildEnvironment; }
    get testEnvironment() { return this.configData.testEnvironment; }
    get defaultVariants() { return this.configData.defaultVariants; }
    get ctestArgs() { return this.configData.ctestArgs; }
    get configureOnOpen() { return this.configData.configureOnOpen; }
    get useCMakeServer() { return this.configData.useCMakeServer; }
    get numJobs() {
        const jobs = this.parallelJobs;
        if (!!jobs) {
            return jobs;
        }
        return os.cpus().length + 2;
    }
    get numCTestJobs() {
        const ctest_jobs = this.ctest_parallelJobs;
        if (!ctest_jobs) {
            return this.numJobs;
        }
        return ctest_jobs;
    }
    get mingwSearchDirs() { return this.configData.mingwSearchDirs; }
    get emscriptenSearchDirs() { return this.configData.emscriptenSearchDirs; }
    get copyCompileCommands() { return this.configData.copyCompileCommands; }
    get loggingLevel() {
        if (process.env['CMT_LOGGING_LEVEL']) {
            return process.env['CMT_LOGGING_LEVEL'];
        }
        return this.configData.loggingLevel;
    }
    get outputLogEncoding() { return this.configData.outputLogEncoding; }
    get enableTraceLogging() { return this.configData.enableTraceLogging; }
    /**
     * Watch for changes on a particular setting
     * @param setting The name of the setting to watch
     * @param cb A callback when the setting changes
     */
    onChange(setting, cb) {
        const emitter = this._emitters[setting];
        return emitter.event(cb);
    }
}
exports.ConfigurationReader = ConfigurationReader;
//# sourceMappingURL=config.js.map