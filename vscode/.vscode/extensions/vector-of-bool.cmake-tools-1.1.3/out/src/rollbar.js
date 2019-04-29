"use strict";
/**
 * Wrapper around Rollbar, for error reporting.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const Rollbar = require("rollbar");
const logging = require("./logging");
const log = logging.createLogger('rollbar');
const SRC_ROOT = path.dirname(__dirname);
/**
 * The wrapper around Rollbar. Presents a nice functional API.
 */
class RollbarController {
    constructor() {
        /**
         * The payload to send with any messages. Can be updated via `updatePayload`.
         */
        this._payload = {
            platform: 'client',
            server: {
                // Because extensions are installed in a user-local directory, the
                // absolute path to the source files will be different on each machine.
                // If we set the root directory of the source tree then Rollbar will be
                // able to better merge identical issues.
                root: SRC_ROOT,
            },
        };
        /**
         * The Rollbar client instance we use to communicate.
         */
        this._rollbar = new Rollbar({
            accessToken: '14d411d713be4a5a9f9d57660534cac7',
            reportLevel: 'error',
            payload: this._payload,
        });
        /**
         * If `true`, we will send messages. We must get the user's permission first!
         */
        this._enabled = false;
    }
    /**
     * Request permission to use Rollbar from the user. This will show a message
     * box at the top of the window on first permission request.
     * @param extensionContext Extension context, where we use a memento to
     * remember our permission
     */
    async requestPermissions(extensionContext) {
        log.debug('Checking Rollbar permissions');
        if (process.env['CMT_TESTING'] === '1') {
            log.trace('Running CMakeTools in test mode. Rollbar is disabled.');
            return;
        }
        if (process.env['CMT_DEVRUN'] === '1') {
            log.trace('Running CMakeTools in developer mode. Rollbar reporting is disabled.');
            return;
        }
        // The memento key where we store permission. Update this to ask again.
        const key = 'rollbar-optin3';
        const optin = extensionContext.globalState.get(key);
        if (optin === true) {
            this._enabled = true;
        }
        else if (optin == false) {
            this._enabled = false;
        }
        else if (optin === undefined) {
            log.debug('Asking user for permission to user Rollbar...');
            // We haven't asked yet. Ask them now:
            const item = await vscode.window.showInformationMessage('Would you like to opt-in to send anonymous error and exception data to help improve CMake Tools?', {
                title: 'Yes!',
                isCloseAffordance: false,
            }, {
                title: 'No Thanks',
                isCloseAffordance: true,
            });
            if (item === undefined) {
                // We didn't get an answer
                log.trace('User did not answer. Rollbar is not enabled.');
                return;
            }
            extensionContext.globalState.update(key, !item.isCloseAffordance);
            this._enabled = !item.isCloseAffordance;
        }
        log.debug('Rollbar enabled? ', this._enabled);
    }
    /**
     * Log an exception with Rollbar.
     * @param what A message about what we were doing when the exception happened
     * @param exception The exception object
     * @param additional Additional items in the payload
     * @returns The LogResult if we are enabled. `null` otherwise.
     */
    exception(what, exception, additional = {}) {
        log.fatal('Unhandled exception:', what, exception, JSON.stringify(additional));
        // tslint:disable-next-line
        console.error(exception);
        debugger;
        if (this._enabled) {
            return this._rollbar.error(what, exception, additional);
        }
        return null;
    }
    /**
     * Log an error with Rollbar
     * @param what A message about what we were doing when the error happened
     * @param additional Additional items in the payload
     * @returns The LogResult if we are enabled. `null` otherwise.
     */
    error(what, additional = {}) {
        log.error(what, JSON.stringify(additional));
        debugger;
        if (this._enabled) {
            const stack = new Error().stack;
            return this._rollbar.error(what, additional, { stack });
        }
        return null;
    }
    info(what, additional = {}) {
        log.info(what, JSON.stringify(additional));
        if (this._enabled) {
            const stack = new Error().stack;
            return this._rollbar.info(what, additional, { stack });
        }
        return null;
    }
    /**
     * Update the content of the Rollbar payload with additional context
     * information.
     * @param data Daya to merge into the payload
     */
    updatePayload(data) {
        Object.assign(this._payload, data);
        this._rollbar.configure({ payload: this._payload });
        log.debug('Updated Rollbar payload', JSON.stringify(data));
    }
    invokeAsync(what, additional, func) {
        if (!func) {
            func = additional;
            additional = {};
        }
        log.trace(`Invoking async function [${func.name}] with Rollbar wrapping`, `[${what}]`);
        const pr = func();
        this.takePromise(what, additional, pr);
    }
    invoke(what, additional, func) {
        if (!func) {
            func = additional;
            additional = {};
        }
        try {
            log.trace(`Invoking function [${func.name}] with Rollbar wrapping`, `[${what}]`);
            return func();
        }
        catch (e) {
            this.exception('Unhandled exception: ' + what, e, additional);
            throw e;
        }
    }
    takePromise(what, additional, pr) {
        pr.then(() => { }, e => { this.exception('Unhandled Promise rejection: ' + what, e, additional); });
    }
}
const rollbar = new RollbarController();
exports.default = rollbar;
//# sourceMappingURL=rollbar.js.map