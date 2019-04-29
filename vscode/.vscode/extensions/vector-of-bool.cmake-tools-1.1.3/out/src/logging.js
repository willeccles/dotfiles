"use strict";
/**
 * Logging utilities
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs = require("fs");
const path = require("path");
const vscode = require("vscode");
/** Logging levels */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 0] = "Trace";
    LogLevel[LogLevel["Debug"] = 1] = "Debug";
    LogLevel[LogLevel["Info"] = 2] = "Info";
    LogLevel[LogLevel["Note"] = 3] = "Note";
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    LogLevel[LogLevel["Error"] = 5] = "Error";
    LogLevel[LogLevel["Fatal"] = 6] = "Fatal";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
/**
 * Get the name of a logging level
 * @param level A logging level
 */
function levelName(level) {
    switch (level) {
        case LogLevel.Trace:
            return 'trace';
        case LogLevel.Debug:
            return 'debug';
        case LogLevel.Info:
            return 'info';
        case LogLevel.Note:
            return 'note';
        case LogLevel.Warning:
            return 'warning';
        case LogLevel.Error:
            return 'error';
        case LogLevel.Fatal:
            return 'fatal';
    }
}
/**
 * Determine if logging is enabled for the given LogLevel
 * @param level The log level to check
 */
function levelEnabled(level) {
    const strlevel = vscode.workspace.getConfiguration('cmake').get('loggingLevel', 'info');
    switch (strlevel) {
        case 'trace':
            return level >= LogLevel.Trace;
        case 'debug':
            return level >= LogLevel.Debug;
        case 'info':
            return level >= LogLevel.Info;
        case 'note':
            return level >= LogLevel.Note;
        case 'warning':
            return level >= LogLevel.Warning;
        case 'error':
            return level >= LogLevel.Error;
        case 'fatal':
            return level >= LogLevel.Fatal;
        default:
            // tslint:disable-next-line
            console.error('Invalid logging level in settings.json');
            return true;
    }
}
/**
 * Manages output channels.
 *
 * Ask the output channel manager when you want to get an output channel for a
 * particular name.
 */
class OutputChannelManager {
    constructor() {
        /**
         * Channels that this manager knows about
         */
        this._channels = new Map();
    }
    /**
     * Get the single instance of a channel with the given name. If the channel
     * doesn't exist, it will be created and returned.
     * @param name The name of the channel to obtain
     */
    get(name) {
        const channel = this._channels.get(name);
        if (!channel) {
            const new_channel = vscode.window.createOutputChannel(name);
            this._channels.set(name, new_channel);
            return new_channel;
        }
        return channel;
    }
    /**
     * Dispose all channels created by this manager
     */
    dispose() { util.map(this._channels.values(), c => c.dispose()); }
}
exports.channelManager = new OutputChannelManager;
let _LOGGER;
function logFilePath() { return path.join(paths_1.default.dataDir, 'log.txt'); }
async function _openLogFile() {
    if (!_LOGGER) {
        _LOGGER = (async () => {
            const fpath = logFilePath();
            await pr_1.fs.mkdir_p(path.dirname(fpath));
            if (await pr_1.fs.exists(fpath)) {
                return node_fs.createWriteStream(fpath, { flags: 'r+' });
            }
            else {
                return node_fs.createWriteStream(fpath, { flags: 'w' });
            }
        })();
    }
    return _LOGGER;
}
/**
 * Manages and controls logging
 */
class SingletonLogger {
    constructor() {
        this._logStream = _openLogFile();
    }
    get _channel() { return exports.channelManager.get('CMake/Build'); }
    _log(level, ...args) {
        const trace = vscode.workspace.getConfiguration('cmake').get('enableTraceLogging', false);
        if (level == LogLevel.Trace && !trace) {
            return;
        }
        const user_message = args.map(a => a.toString()).join(' ');
        const prefix = new Date().toISOString() + ` [${levelName(level)}]`;
        const raw_message = `${prefix} ${user_message}`;
        switch (level) {
            case LogLevel.Trace:
            case LogLevel.Debug:
            case LogLevel.Info:
            case LogLevel.Note:
                if (process.env['CMT_QUIET_CONSOLE'] !== '1') {
                    // tslint:disable-next-line
                    console.info('[CMakeTools]', raw_message);
                }
                break;
            case LogLevel.Warning:
                // tslint:disable-next-line
                console.warn('[CMakeTools]', raw_message);
                break;
            case LogLevel.Error:
            case LogLevel.Fatal:
                // tslint:disable-next-line
                console.error('[CMakeTools]', raw_message);
                break;
        }
        // Write to the logfile asynchronously.
        this._logStream.then(strm => strm.write(raw_message + '\n')).catch(e => {
            // tslint:disable-next-line
            console.error('Unhandled error while writing CMakeTools log file', e);
        });
        // Write to our output channel
        if (levelEnabled(level)) {
            this._channel.appendLine(user_message);
        }
    }
    trace(...args) { this._log(LogLevel.Trace, ...args); }
    debug(...args) { this._log(LogLevel.Debug, ...args); }
    info(...args) { this._log(LogLevel.Info, ...args); }
    note(...args) { this._log(LogLevel.Note, ...args); }
    warning(...args) { this._log(LogLevel.Warning, ...args); }
    error(...args) { this._log(LogLevel.Error, ...args); }
    fatal(...args) { this._log(LogLevel.Fatal, ...args); }
    clearOutputChannel() { this._channel.clear(); }
    showChannel(preserveFocus) { this._channel.show(preserveFocus); }
    static instance() {
        if (SingletonLogger._inst === null) {
            SingletonLogger._inst = new SingletonLogger();
        }
        return SingletonLogger._inst;
    }
}
SingletonLogger._inst = null;
class Logger {
    constructor(_tag) {
        this._tag = _tag;
    }
    get tag() { return `[${this._tag}]`; }
    trace(...args) { SingletonLogger.instance().trace(this.tag, ...args); }
    debug(...args) { SingletonLogger.instance().debug(this.tag, ...args); }
    info(...args) { SingletonLogger.instance().info(this.tag, ...args); }
    note(...args) { SingletonLogger.instance().note(this.tag, ...args); }
    warning(...args) { SingletonLogger.instance().warning(this.tag, ...args); }
    error(...args) { SingletonLogger.instance().error(this.tag, ...args); }
    fatal(...args) { SingletonLogger.instance().fatal(this.tag, ...args); }
    clearOutputChannel() { SingletonLogger.instance().clearOutputChannel(); }
    showChannel() {
        const reveal_log = vscode.workspace.getConfiguration('cmake').get('revealLog', 'always');
        const should_show = (reveal_log !== 'never');
        const should_focus = (reveal_log === 'focus');
        if (should_show) {
            SingletonLogger.instance().showChannel(!should_focus);
        }
    }
}
exports.Logger = Logger;
function createLogger(tag) { return new Logger(tag); }
exports.createLogger = createLogger;
async function showLogFile() {
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logFilePath()));
}
exports.showLogFile = showLogFile;
// The imports aren't needed immediately, so we can drop them all the way down
// here since we may have circular imports
const util = require("./util");
const pr_1 = require("./pr");
const paths_1 = require("./paths");
//# sourceMappingURL=logging.js.map