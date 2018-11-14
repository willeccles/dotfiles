"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { Client } = require('discord-rpc');
const vscode_1 = require("vscode");
const Activity_1 = require("../structures/Activity");
const Logger_1 = require("../structures/Logger");
let activityTimer;
class RPCClient {
    constructor(clientId, statusBarIcon) {
        this.config = vscode_1.workspace.getConfiguration('discord');
        this._activity = new Activity_1.default();
        this._clientId = clientId;
        this.statusBarIcon = statusBarIcon;
    }
    get client() {
        return this._rpc;
    }
    setActivity(workspaceElapsedTime = false) {
        if (!this._rpc)
            return;
        const activity = this._activity.generate(workspaceElapsedTime);
        Logger_1.default.log('Sending activity to Discord.');
        this._rpc.setActivity(activity);
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._rpc)
                return;
            this._rpc = new Client({ transport: 'ipc' });
            Logger_1.default.log('Logging into RPC.');
            this._rpc.once('ready', () => {
                Logger_1.default.log('Successfully connected to Discord.');
                if (!this.config.get('silent'))
                    vscode_1.window.showInformationMessage('Successfully connected to Discord RPC');
                this.statusBarIcon.hide();
                this.statusBarIcon.text = '$(plug) Reconnect to Discord';
                this.statusBarIcon.command = 'discord.reconnect';
                if (activityTimer)
                    clearInterval(activityTimer);
                this.setActivity();
                this._rpc.transport.once('close', () => __awaiter(this, void 0, void 0, function* () {
                    if (!this.config.get('enabled'))
                        return;
                    yield this.dispose();
                    this.statusBarIcon.show();
                }));
                activityTimer = setInterval(() => {
                    this.config = vscode_1.workspace.getConfiguration('discord');
                    this.setActivity(this.config.get('workspaceElapsedTime'));
                }, 10000);
            });
            yield this._rpc.login({ clientId: this._clientId });
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            this._activity.dispose();
            if (this._rpc) {
                yield this._rpc.destroy();
                this._rpc = null;
            }
            clearInterval(activityTimer);
        });
    }
}
exports.default = RPCClient;

//# sourceMappingURL=RPCClient.js.map
