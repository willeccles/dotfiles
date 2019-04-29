"use strict";
/**
 * Module for the legacy driver. Talks to pre-CMake Server versions of CMake.
 * Can also talk to newer versions of CMake via the command line.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const cache_1 = require("./cache");
const driver_1 = require("./driver");
// import * as proc from './proc';
const logging = require("./logging");
const pr_1 = require("./pr");
const rollbar_1 = require("./rollbar");
const util = require("./util");
const log = logging.createLogger('legacy-driver');
/**
 * The legacy driver.
 */
class LegacyCMakeDriver extends driver_1.CMakeDriver {
    constructor(cmake, ws) {
        super(cmake, ws);
        this.ws = ws;
        this._needsReconfigure = true;
        /**
         * Watcher for the CMake cache file on disk.
         */
        this._cacheWatcher = vscode.workspace.createFileSystemWatcher(this.cachePath);
        this._cmakeCache = null;
    }
    doConfigureSettingsChange() { this._needsReconfigure = true; }
    async checkNeedsReconfigure() { return this._needsReconfigure; }
    async doSetKit(need_clean, cb) {
        this._needsReconfigure = true;
        if (need_clean) {
            await this._cleanPriorConfiguration();
        }
        await cb();
    }
    // Legacy disposal does nothing
    async asyncDispose() { this._cacheWatcher.dispose(); }
    async doConfigure(args_, outputConsumer) {
        // Dup args so we can modify them
        const args = Array.from(args_);
        args.push('-H' + util.lightNormalizePath(this.sourceDir));
        const bindir = util.lightNormalizePath(this.binaryDir);
        args.push('-B' + bindir);
        const gen = await this.getBestGenerator();
        if (gen) {
            args.push(`-G${gen.name}`);
            if (gen.toolset) {
                args.push(`-T${gen.toolset}`);
            }
            if (gen.platform) {
                args.push(`-A${gen.platform}`);
            }
        }
        const cmake = this.cmake.path;
        log.debug('Invoking CMake', cmake, 'with arguments', JSON.stringify(args));
        const env = await this.getConfigureEnvironment();
        const res = await this.executeCommand(cmake, args, outputConsumer, { environment: env }).result;
        log.trace(res.stderr);
        log.trace(res.stdout);
        if (res.retc == 0) {
            this._needsReconfigure = false;
        }
        await this._reloadPostConfigure();
        return res.retc === null ? -1 : res.retc;
    }
    async cleanConfigure(consumer) {
        await this._cleanPriorConfiguration();
        return this.configure([], consumer);
    }
    async doPostBuild() {
        await this._reloadPostConfigure();
        return true;
    }
    async doInit() {
        if (await pr_1.fs.exists(this.cachePath)) {
            await this._reloadPostConfigure();
        }
        this._cacheWatcher.onDidChange(() => {
            log.debug(`Reload CMake cache: ${this.cachePath} changed`);
            rollbar_1.default.invokeAsync('Reloading CMake Cache', () => this._reloadPostConfigure());
        });
    }
    static async create(cmake, ws, kit) {
        log.debug('Creating instance of LegacyCMakeDriver');
        return this.createDerived(new LegacyCMakeDriver(cmake, ws), kit);
    }
    get targets() { return []; }
    get executableTargets() { return []; }
    get cmakeCache() { return this._cmakeCache; }
    async _reloadPostConfigure() {
        // Force await here so that any errors are thrown into rollbar
        const new_cache = await cache_1.CMakeCache.fromPath(this.cachePath);
        this._cmakeCache = new_cache;
    }
    get cmakeCacheEntries() {
        let ret = new Map();
        if (this.cmakeCache) {
            ret = util.reduce(this.cmakeCache.allEntries, ret, (acc, entry) => acc.set(entry.key, entry));
        }
        return ret;
    }
    get generatorName() {
        if (!this.cmakeCache) {
            return null;
        }
        const gen = this.cmakeCache.get('CMAKE_GENERATOR');
        return gen ? gen.as() : null;
    }
}
exports.LegacyCMakeDriver = LegacyCMakeDriver;
//# sourceMappingURL=legacy-driver.js.map