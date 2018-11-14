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
const vscode_1 = require("vscode");
const RPCClient_1 = require("./client/RPCClient");
const Logger_1 = require("./structures/Logger");
const statusBarIcon = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
statusBarIcon.text = '$(pulse) Connecting...';
statusBarIcon.command = 'discord.reconnect';
const config = vscode_1.workspace.getConfiguration('discord');
const rpc = new RPCClient_1.default(config.get('clientID'), statusBarIcon);
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        Logger_1.default.log('Discord Presence activated!');
        if (config.get('enabled')) {
            statusBarIcon.show();
            try {
                yield rpc.login();
            }
            catch (error) {
                Logger_1.default.log(`Encountered following error after trying to login:\n${error}`);
                if (!config.get('silent')) {
                    if (error.message.includes('ENOENT'))
                        vscode_1.window.showErrorMessage('No Discord Client detected!');
                    else
                        vscode_1.window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error.toString()}`);
                }
                rpc.statusBarIcon.text = '$(pulse) Reconnect';
                rpc.statusBarIcon.command = 'discord.reconnect';
                rpc.statusBarIcon.show();
            }
        }
        const enabler = vscode_1.commands.registerCommand('discord.enable', () => __awaiter(this, void 0, void 0, function* () {
            yield rpc.dispose();
            yield config.update('enabled', true);
            rpc.config = vscode_1.workspace.getConfiguration('discord');
            rpc.statusBarIcon.text = '$(pulse) Connecting...';
            rpc.statusBarIcon.show();
            yield rpc.login();
            vscode_1.window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
        }));
        const disabler = vscode_1.commands.registerCommand('discord.disable', () => __awaiter(this, void 0, void 0, function* () {
            yield config.update('enabled', false);
            rpc.config = vscode_1.workspace.getConfiguration('discord');
            yield rpc.dispose();
            vscode_1.window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
        }));
        const reconnecter = vscode_1.commands.registerCommand('discord.reconnect', () => __awaiter(this, void 0, void 0, function* () {
            yield rpc.dispose();
            yield rpc.login();
            if (!config.get('silent'))
                vscode_1.window.showInformationMessage('Reconnecting to Discord RPC...');
            rpc.statusBarIcon.text = '$(pulse) Reconnecting...';
            rpc.statusBarIcon.command = undefined;
        }));
        context.subscriptions.push(enabler, disabler, reconnecter);
    });
}
exports.activate = activate;
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        yield rpc.dispose();
    });
}
exports.deactivate = deactivate;
process.on('unhandledRejection', err => Logger_1.default.log(err));

//# sourceMappingURL=extension.js.map
