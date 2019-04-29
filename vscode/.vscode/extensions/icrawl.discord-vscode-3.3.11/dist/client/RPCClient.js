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
const { Client } = require('discord-rpc'); // tslint:disable-line
const vscode_1 = require("vscode"); // tslint:disable-line
const vsls = require("vsls/vscode");
const Activity_1 = require("../structures/Activity");
const Logger_1 = require("../structures/Logger");
const clipboardy = require('clipboardy'); // tslint:disable-line
let activityTimer;
class RPCClient {
    constructor(clientId, statusBarIcon) {
        this.config = vscode_1.workspace.getConfiguration('discord');
        this._activity = new Activity_1.default(); // tslint:disable-line
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
    allowSpectate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._rpc)
                return;
            Logger_1.default.log('Allowed spectating.');
            Logger_1.default.log('Sending spectate activity to Discord.');
            yield this._activity.allowSpectate();
        });
    }
    disableSpectate() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._rpc)
                return;
            Logger_1.default.log('Disabled spectating.');
            yield this._activity.disableSpectate();
        });
    }
    allowJoinRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._rpc)
                return;
            Logger_1.default.log('Allowed join requests.');
            Logger_1.default.log('Sending join activity to Discord.');
            yield this._activity.allowJoinRequests();
        });
    }
    disableJoinRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._rpc)
                return;
            Logger_1.default.log('Disabled join requests.');
            yield this._activity.disableJoinRequests();
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._rpc)
                return;
            this._rpc = new Client({ transport: 'ipc' });
            Logger_1.default.log('Logging into RPC.');
            this._rpc.once('ready', () => __awaiter(this, void 0, void 0, function* () {
                Logger_1.default.log('Successfully connected to Discord.');
                this.statusBarIcon.text = '$(globe) Connected to Discord';
                this.statusBarIcon.tooltip = 'Connected to Discord';
                setTimeout(() => this.statusBarIcon.text = '$(globe)', 5000);
                if (activityTimer)
                    clearInterval(activityTimer);
                this.setActivity();
                activityTimer = setInterval(() => {
                    this.config = vscode_1.workspace.getConfiguration('discord');
                    this.setActivity(this.config.get('workspaceElapsedTime'));
                }, 10000);
                this._rpc.subscribe('ACTIVITY_SPECTATE', ({ secret }) => __awaiter(this, void 0, void 0, function* () {
                    const liveshare = yield vsls.getApi();
                    if (!liveshare)
                        return;
                    try {
                        const s = Buffer.from(secret, 'base64').toString();
                        // You might be asking yourself: "but why?"
                        // VS Liveshare has this annoying bug where you convert a URL string to a URI object to autofill
                        // But the autofill will be empty, so to circumvent this I need to add copying the link to the clipboard
                        // And immediately pasting it after the window pops up empty
                        yield clipboardy.write(s);
                        yield liveshare.join(vscode_1.Uri.parse(s));
                        yield clipboardy.read();
                    }
                    catch (error) {
                        Logger_1.default.log(error);
                    }
                }));
                // You might be asking yourself again: "but why?"
                // Same here, this is a real nasty race condition that happens inside the discord-rpc module currently
                // To circumvent this we need to timeout sending the subscribe events to the discord client
                setTimeout(() => {
                    this._rpc.subscribe('ACTIVITY_JOIN_REQUEST', ({ user }) => __awaiter(this, void 0, void 0, function* () {
                        vscode_1.window.showInformationMessage(`${user.username}#${user.discriminator} wants to join your session`, { title: 'Accept' }, { title: 'Decline' })
                            .then((val) => __awaiter(this, void 0, void 0, function* () {
                            if (val && val.title === 'Accept')
                                yield this._rpc.sendJoinInvite(user);
                            else
                                yield this._rpc.closeJoinRequest(user);
                        }));
                    }));
                }, 500);
                setTimeout(() => {
                    this._rpc.subscribe('ACTIVITY_JOIN', ({ secret }) => __awaiter(this, void 0, void 0, function* () {
                        const liveshare = yield vsls.getApi();
                        if (!liveshare)
                            return;
                        try {
                            const s = Buffer.from(secret, 'base64').toString();
                            // You might be asking yourself again again: "but why?"
                            // See first comment on clipboardy above
                            yield clipboardy.write(s);
                            yield liveshare.join(vscode_1.Uri.parse(s));
                            yield clipboardy.read();
                        }
                        catch (error) {
                            Logger_1.default.log(error);
                        }
                    }));
                }, 1000);
                const liveshare = yield vsls.getApi();
                if (!liveshare)
                    return;
                liveshare.onDidChangeSession(({ session }) => {
                    if (session.id)
                        return this._activity.changePartyId(session.id);
                    else
                        return this._activity.changePartyId();
                });
                liveshare.onDidChangePeers(({ added, removed }) => {
                    if (added.length)
                        return this._activity.increasePartySize(added.length);
                    else if (removed.length)
                        return this._activity.decreasePartySize(removed.length);
                });
            }));
            this._rpc.transport.once('close', () => __awaiter(this, void 0, void 0, function* () {
                if (!this.config.get('enabled'))
                    return;
                yield this.dispose();
                this.statusBarIcon.text = '$(plug) Reconnect to Discord';
                this.statusBarIcon.command = 'discord.reconnect';
                this.statusBarIcon.tooltip = '';
            }));
            yield this._rpc.login({ clientId: this._clientId });
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            this._activity.dispose();
            try {
                yield this._rpc.destroy();
                // tslint:disable-next-line
            }
            catch (_a) { }
            this._rpc = null;
            this.statusBarIcon.tooltip = '';
            clearInterval(activityTimer);
        });
    }
}
exports.default = RPCClient;

//# sourceMappingURL=RPCClient.js.map
