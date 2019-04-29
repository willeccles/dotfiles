"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dirty_1 = require("@cmt/dirty");
const path = require("path");
const vscode = require("vscode");
const api = require("./api");
const cache = require("./cache");
const cms = require("./cms-client");
const driver_1 = require("./driver");
const logging_1 = require("./logging");
const rollbar_1 = require("./rollbar");
const log = logging_1.createLogger('cms-driver');
class CMakeServerClientDriver extends driver_1.CMakeDriver {
    constructor(cmake, _ws) {
        super(cmake, _ws);
        this._ws = _ws;
        this._clientChangeInProgress = Promise.resolve();
        this._cacheEntries = new Map();
        this._cmakeInputFileSet = dirty_1.InputFileSet.createEmpty();
        this._progressEmitter = new vscode.EventEmitter();
        /**
         * The previous configuration environment. Used to detect when we need to
         * restart cmake-server
         */
        this._prevConfigureEnv = 'null';
        this._codeModelChanged = new vscode.EventEmitter();
        /**
         * Track if the user changes the settings of the configure via settings.json
         */
        this._hadConfigurationChanged = true;
        this._onMessageEmitter = new vscode.EventEmitter();
        this._ws.config.onChange('environment', () => this._restartClient());
        this._ws.config.onChange('configureEnvironment', () => this._restartClient());
    }
    get onProgress() {
        return this._progressEmitter.event;
    }
    get codeModel() { return this._codeModel; }
    set codeModel(v) {
        this._codeModel = v;
    }
    get onCodeModelChanged() { return this._codeModelChanged.event; }
    async asyncDispose() {
        this._codeModelChanged.dispose();
        this._progressEmitter.dispose();
        if (this._cmsClient) {
            await (await this._cmsClient).shutdown();
        }
    }
    async cleanConfigure(consumer) {
        const old_cl = await this._cmsClient;
        this._cmsClient = (async () => {
            // Stop the server before we try to rip out any old files
            await old_cl.shutdown();
            await this._cleanPriorConfiguration();
            return this._startNewClient();
        })();
        return this.configure([], consumer);
    }
    async doConfigure(args, consumer) {
        await this._clientChangeInProgress;
        const cl = await this._cmsClient;
        const sub = this.onMessage(msg => {
            if (consumer) {
                for (const line of msg.split('\n')) {
                    consumer.output(line);
                }
            }
        });
        try {
            this._hadConfigurationChanged = false;
            await cl.configure({ cacheArguments: args });
            await cl.compute();
        }
        catch (e) {
            if (e instanceof cms.ServerError) {
                log.error(`Error during CMake configure: ${e}`);
                return 1;
            }
            else {
                throw e;
            }
        }
        finally {
            sub.dispose();
        }
        await this._refreshPostConfigure();
        return 0;
    }
    async doPreBuild() { return true; }
    async doPostBuild() {
        await this._refreshPostConfigure();
        return true;
    }
    async _refreshPostConfigure() {
        const cl = await this._cmsClient;
        const cmake_inputs = await cl.cmakeInputs(); // <-- 1. This line generates the error
        // Scan all the CMake inputs and capture their mtime so we can check for
        // out-of-dateness later
        this._cmakeInputFileSet = await dirty_1.InputFileSet.create(cmake_inputs);
        const clcache = await cl.getCMakeCacheContent();
        this._cacheEntries = clcache.cache.reduce((acc, el) => {
            const entry_map = {
                BOOL: api.CacheEntryType.Bool,
                STRING: api.CacheEntryType.String,
                PATH: api.CacheEntryType.Path,
                FILEPATH: api.CacheEntryType.FilePath,
                INTERNAL: api.CacheEntryType.Internal,
                UNINITIALIZED: api.CacheEntryType.Uninitialized,
                STATIC: api.CacheEntryType.Static,
            };
            const type = entry_map[el.type];
            if (type === undefined) {
                rollbar_1.default.error(`Unknown cache entry type ${el.type}`);
                return acc;
            }
            acc.set(el.key, new cache.Entry(el.key, el.value, type, el.properties.HELPSTRING, el.properties.ADVANCED === '1'));
            return acc;
        }, new Map());
        this.codeModel = await cl.sendRequest('codemodel');
        this._codeModelChanged.fire(this.codeModel);
    }
    async doRefreshExpansions(cb) {
        log.debug('Run doRefreshExpansions');
        const bindir_before = this.binaryDir;
        const srcdir_before = this.sourceDir;
        await cb();
        if (!bindir_before.length || !srcdir_before.length) {
            return;
        }
        const new_env = JSON.stringify(await this.getConfigureEnvironment());
        if (bindir_before !== this.binaryDir || srcdir_before != this.sourceDir || new_env != this._prevConfigureEnv) {
            // Directories changed. We need to restart the driver
            await this._restartClient();
        }
        this._prevConfigureEnv = new_env;
    }
    get targets() {
        if (!this._codeModel) {
            return [];
        }
        const build_config = this._codeModel.configurations.find(conf => conf.name == this.currentBuildType);
        if (!build_config) {
            log.error('Found no matching code model for the current build type. This shouldn\'t be possible');
            return [];
        }
        return build_config.projects.reduce((acc, project) => acc.concat(project.targets.map(t => ({
            type: 'rich',
            name: t.name,
            filepath: t.artifacts && t.artifacts.length
                ? path.normalize(t.artifacts[0])
                : 'Utility target',
            targetType: t.type,
        }))), [{
                type: 'rich',
                name: this.allTargetName,
                filepath: 'A special target to build all available targets',
                targetType: 'META',
            }]);
    }
    get executableTargets() {
        return this.targets.filter(t => t.targetType === 'EXECUTABLE').map(t => ({
            name: t.name,
            path: t.filepath,
        }));
    }
    get generatorName() { return this._globalSettings ? this._globalSettings.generator : null; }
    doConfigureSettingsChange() {
        this._hadConfigurationChanged = true;
    }
    async checkNeedsReconfigure() {
        if (this._hadConfigurationChanged) {
            return this._hadConfigurationChanged;
        }
        // If we have no input files, we probably haven't configured yet
        if (this._cmakeInputFileSet.inputFiles.length === 0) {
            return true;
        }
        return this._cmakeInputFileSet.checkOutOfDate();
    }
    get cmakeCacheEntries() { return this._cacheEntries; }
    async _setKitAndRestart(need_clean, cb) {
        this._cmakeInputFileSet = dirty_1.InputFileSet.createEmpty();
        const client = await this._cmsClient;
        await client.shutdown();
        if (need_clean) {
            await this._cleanPriorConfiguration();
        }
        await cb();
        await this._restartClient();
    }
    async doSetKit(need_clean, cb) {
        this._clientChangeInProgress = this._setKitAndRestart(need_clean, cb);
        return this._clientChangeInProgress;
    }
    async _restartClient() {
        this._cmsClient = this._doRestartClient();
        const client = await this._cmsClient;
        this._globalSettings = await client.getGlobalSettings();
    }
    async _doRestartClient() {
        const old_client = this._cmsClient;
        if (old_client) {
            const cl = await old_client;
            await cl.shutdown();
        }
        return this._startNewClient();
    }
    async _startNewClient() {
        return cms.CMakeServerClient.start(this._ws.config, {
            binaryDir: this.binaryDir,
            sourceDir: this.sourceDir,
            cmakePath: this.cmake.path,
            environment: await this.getConfigureEnvironment(),
            onDirty: async () => {
                // cmake-server has dirty check issues, so we implement our own dirty
                // checking. Maybe in the future this can be useful for auto-configuring
                // on file changes?
            },
            onOtherOutput: async (msg) => this._onMessageEmitter.fire(msg),
            onMessage: async (msg) => { this._onMessageEmitter.fire(msg.message); },
            onProgress: async (prog) => {
                this._progressEmitter.fire(prog);
            },
            pickGenerator: () => this.getBestGenerator(),
        });
    }
    get onMessage() { return this._onMessageEmitter.event; }
    async doInit() { await this._restartClient(); }
    static async create(cmake, wsc, kit) {
        return this.createDerived(new CMakeServerClientDriver(cmake, wsc), kit);
    }
}
exports.CMakeServerClientDriver = CMakeServerClientDriver;
//# sourceMappingURL=cms-driver.js.map