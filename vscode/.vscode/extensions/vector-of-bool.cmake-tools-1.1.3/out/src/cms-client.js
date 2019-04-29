"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_proc = require("child_process");
const net = require("net");
const path = require("path");
const vscode = require("vscode");
const cache = require("./cache");
const logging_1 = require("./logging");
const pr_1 = require("./pr");
const rollbar_1 = require("./rollbar");
const util = require("./util");
const log = logging_1.createLogger('cms-client');
const ENABLE_CMSERVER_PROTO_DEBUG = false;
const MESSAGE_WRAPPER_RE = /\[== "CMake Server" ==\[([^]*?)\]== "CMake Server" ==\]\s*([^]*)/;
class StartupError extends global.Error {
    constructor(retc) {
        super('Error starting up cmake-server');
        this.retc = retc;
    }
}
exports.StartupError = StartupError;
class ServerError extends Error {
    constructor(e, errorMessage = e.errorMessage, cookie = e.cookie, inReplyTo = e.inReplyTo) {
        super(e.errorMessage);
        this.errorMessage = errorMessage;
        this.cookie = cookie;
        this.inReplyTo = inReplyTo;
        this.type = 'error';
    }
    toString() { return `[cmake-server] ${this.errorMessage}`; }
}
exports.ServerError = ServerError;
class NoGeneratorError extends Error {
}
exports.NoGeneratorError = NoGeneratorError;
class BadHomeDirectoryError extends Error {
    constructor(cached, expecting, badCachePath) {
        super();
        this.cached = cached;
        this.expecting = expecting;
        this.badCachePath = badCachePath;
    }
}
exports.BadHomeDirectoryError = BadHomeDirectoryError;
class CMakeServerClient {
    constructor(params) {
        this._accInput = '';
        this._promisesResolvers = new Map;
        this._params = params;
        let pipe_file = path.join(params.tmpdir, '.cmserver-pipe');
        if (process.platform === 'win32') {
            pipe_file = '\\\\?\\pipe\\' + pipe_file;
        }
        else {
            pipe_file = `/tmp/cmake-server-${Math.random()}`;
        }
        this._pipeFilePath = pipe_file;
        const final_env = util.mergeEnvironment(process.env, params.environment);
        const child = this._proc
            = child_proc.spawn(params.cmakePath, ['-E', 'server', '--experimental', `--pipe=${pipe_file}`], {
                env: final_env, cwd: params.binaryDir
            });
        log.debug(`Started new CMake Server instance with PID ${child.pid}`);
        child.stdout.on('data', data => this._params.onOtherOutput(data.toLocaleString()));
        child.stderr.on('data', data => this._params.onOtherOutput(data.toLocaleString()));
        setTimeout(() => {
            const end_promise = new Promise((resolve, reject) => {
                const pipe = this._pipe = net.createConnection(pipe_file);
                pipe.on('data', this._onMoreData.bind(this));
                pipe.on('error', e => {
                    debugger;
                    pipe.end();
                    rollbar_1.default.takePromise('Pipe error from cmake-server', { pipe: pipe_file }, params.onPipeError(e));
                    reject(e);
                });
                pipe.on('end', () => {
                    pipe.end();
                    resolve();
                });
            });
            const exit_promise = new Promise(resolve => { child.on('exit', () => { resolve(); }); });
            this._endPromise = Promise.all([end_promise, exit_promise]).then(() => { });
            this._proc = child;
            child.on('close', (retc, signal) => {
                if (retc !== 0) {
                    log.error('The connection to cmake-server was terminated unexpectedly');
                    log.error(`cmake-server exited with status ${retc} (${signal})`);
                    params.onCrash(retc, signal).catch(e => { log.error(`Unhandled error in onCrash ${e}`); });
                }
            });
        }, 1000);
    }
    _onMoreData(data) {
        const str = data.toString();
        this._accInput += str;
        while (1) {
            const input = this._accInput;
            const mat = MESSAGE_WRAPPER_RE.exec(input);
            if (!mat) {
                break;
            }
            if (mat.length !== 3) {
                debugger;
                throw new global.Error('Protocol error talking to CMake! Got this input: ' + input);
            }
            this._accInput = mat[2];
            if (ENABLE_CMSERVER_PROTO_DEBUG) {
                log.debug(`Received message from cmake-server: ${mat[1]}`);
            }
            const message = JSON.parse(mat[1]);
            this._onMessage(message);
        }
    }
    _takePromiseForCookie(cookie) {
        const item = this._promisesResolvers.get(cookie);
        if (!item) {
            throw new global.Error('Invalid cookie: ' + cookie);
        }
        this._promisesResolvers.delete(cookie);
        return item;
    }
    _onMessage(some) {
        if ('cookie' in some) {
            const cookied = some;
            switch (some.type) {
                case 'reply': {
                    const reply = cookied;
                    const pr = this._takePromiseForCookie(cookied.cookie);
                    if (pr) {
                        pr.resolve(reply);
                    }
                    else {
                        log.error(`CMake server cookie "${cookied.cookie}" does not correspond to a known message`);
                    }
                    return;
                }
                case 'error': {
                    const err = new ServerError(cookied);
                    const pr = this._takePromiseForCookie(cookied.cookie);
                    if (pr) {
                        pr.reject(err);
                    }
                    else {
                        log.error(`CMake server cookie "${cookied.cookie}" does not correspond to a known message`);
                    }
                    return;
                }
                case 'progress': {
                    const prog = cookied;
                    this._params.onProgress(prog).catch(e => { log.error('Unandled error in onProgress', e); });
                    return;
                }
            }
        }
        switch (some.type) {
            case 'hello': {
                const unlink_pr = pr_1.fs.exists(this._pipeFilePath).then(async (exists) => {
                    if (exists && process.platform !== 'win32') {
                        await pr_1.fs.unlink(this._pipeFilePath);
                    }
                });
                rollbar_1.default.takePromise('Unlink pipe', { pipe: this._pipeFilePath }, unlink_pr);
                this._params.onHello(some).catch(e => { log.error('Unhandled error in onHello', e); });
                return;
            }
            case 'message': {
                this._params.onMessage(some).catch(e => { log.error('Unhandled error in onMessage', e); });
                return;
            }
            case 'signal': {
                const sig = some;
                switch (sig.name) {
                    case 'dirty': {
                        this._params.onDirty().catch(e => { log.error('Unhandled error in onDirty', e); });
                        return;
                    }
                    case 'fileChange': {
                        return;
                    }
                }
            }
        }
        debugger;
        log.warning(`Can't yet handle the ${some.type} messages`);
    }
    sendRequest(type, params = {}) {
        const cp = Object.assign({ type }, params);
        const cookie = cp.cookie = Math.random().toString();
        const pr = new Promise((resolve, reject) => { this._promisesResolvers.set(cookie, { resolve, reject }); });
        const msg = JSON.stringify(cp);
        if (ENABLE_CMSERVER_PROTO_DEBUG) {
            log.debug(`Sending message to cmake-server: ${msg}`);
        }
        this._pipe.write('\n[== "CMake Server" ==[\n');
        this._pipe.write(msg);
        this._pipe.write('\n]== "CMake Server" ==]\n');
        return pr;
    }
    setGlobalSettings(params) {
        return this.sendRequest('setGlobalSettings', params);
    }
    getCMakeCacheContent() { return this.sendRequest('cache'); }
    getGlobalSettings() { return this.sendRequest('globalSettings'); }
    configure(params) { return this.sendRequest('configure', params); }
    compute(params) { return this.sendRequest('compute', params); }
    codemodel(params) { return this.sendRequest('codemodel', params); }
    cmakeInputs(params) { return this.sendRequest('cmakeInputs', params); }
    async shutdown() {
        this._pipe.end();
        await this._endPromise;
    }
    static async start(config, params) {
        let resolved = false;
        const tmpdir = path.join(vscode.workspace.rootPath, '.vscode');
        // Ensure the binary directory exists
        await pr_1.fs.mkdir_p(params.binaryDir);
        return new Promise((resolve, reject) => {
            const client = new CMakeServerClient({
                tmpdir,
                sourceDir: params.sourceDir,
                binaryDir: params.binaryDir,
                onMessage: params.onMessage,
                onOtherOutput: other => params.onOtherOutput(other),
                cmakePath: params.cmakePath,
                environment: params.environment,
                onProgress: params.onProgress,
                onDirty: params.onDirty,
                pickGenerator: params.pickGenerator,
                onCrash: async (retc) => {
                    if (!resolved) {
                        reject(new StartupError(retc));
                    }
                },
                onPipeError: async (e) => {
                    if (!resolved) {
                        reject(e);
                    }
                },
                onHello: async (msg) => {
                    // We've gotten the hello message. We need to commense handshake
                    try {
                        const hsparams = { buildDirectory: params.binaryDir, protocolVersion: msg.supportedProtocolVersions[0] };
                        const cache_path = path.join(params.binaryDir, 'CMakeCache.txt');
                        const have_cache = await pr_1.fs.exists(cache_path);
                        if (have_cache) {
                            // Work-around: CMake Server checks that CMAKE_HOME_DIRECTORY
                            // in the cmake cache is the same as what we provide when we
                            // set up the connection. Because CMake may normalize the
                            // path differently than we would, we should make sure that
                            // we pass the value that is specified in the cache exactly
                            // to avoid causing CMake server to spuriously fail.
                            // While trying to fix issue above CMake broke ability to run
                            // with an empty sourceDir, so workaround because necessary for
                            // different CMake versions.
                            // See
                            // https://gitlab.kitware.com/cmake/cmake/issues/16948
                            // https://gitlab.kitware.com/cmake/cmake/issues/16736
                            const tmpcache = await cache.CMakeCache.fromPath(cache_path);
                            const src_dir = tmpcache.get('CMAKE_HOME_DIRECTORY');
                            if (src_dir) {
                                const cachedDir = src_dir.as();
                                if (!util.platformPathEquivalent(cachedDir, params.sourceDir)) {
                                    // If src_dir is different, clean configure is required as CMake won't accept it anyways.
                                    throw new BadHomeDirectoryError(cachedDir, params.sourceDir, cache_path);
                                }
                                hsparams.sourceDirectory = cachedDir;
                            }
                        }
                        else {
                            // Do clean configure, all parameters are required.
                            const generator = await params.pickGenerator();
                            if (!generator) {
                                throw new NoGeneratorError();
                            }
                            hsparams.sourceDirectory = params.sourceDir;
                            hsparams.generator = generator.name;
                            hsparams.platform = generator.platform;
                            hsparams.toolset = generator.toolset || config.toolset || undefined;
                            log.info(`Configuring using the "${generator.name}" CMake generator`);
                        }
                        await client.sendRequest('handshake', hsparams);
                        resolved = true;
                        resolve(client);
                    }
                    catch (e) {
                        await client.shutdown();
                        resolved = true;
                        reject(e);
                    }
                },
            });
        });
    }
}
exports.CMakeServerClient = CMakeServerClient;
//# sourceMappingURL=cms-client.js.map