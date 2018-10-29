// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
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
const vscode = require("vscode");
const vscode_1 = require("vscode");
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const ArchetypeModule_1 = require("./archetype/ArchetypeModule");
const MavenExplorerProvider_1 = require("./explorer/MavenExplorerProvider");
const MavenProjectNode_1 = require("./explorer/model/MavenProjectNode");
const Settings_1 = require("./Settings");
const Utils_1 = require("./Utils");
const VSCodeUI_1 = require("./VSCodeUI");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Utils_1.Utils.loadPackageInfo(context);
        // Usage data statistics.
        if (Utils_1.Utils.getAiKey()) {
            vscode_extension_telemetry_wrapper_1.TelemetryWrapper.initilize(Utils_1.Utils.getExtensionPublisher(), Utils_1.Utils.getExtensionName(), Utils_1.Utils.getExtensionVersion(), Utils_1.Utils.getAiKey());
            yield vscode_extension_telemetry_wrapper_1.initializeFromJsonFile(context.asAbsolutePath("./package.json"));
        }
        yield vscode_extension_telemetry_wrapper_1.instrumentOperation("activation", doActivate)(context);
    });
}
exports.activate = activate;
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        yield vscode_extension_telemetry_wrapper_1.dispose();
    });
}
exports.deactivate = deactivate;
function registerCommand(context, commandName, func) {
    const callbackWithTroubleshooting = vscode_extension_telemetry_wrapper_1.instrumentOperation(commandName, (_operationId, ...args) => __awaiter(this, void 0, void 0, function* () {
        try {
            return yield func(...args);
        }
        catch (error) {
            VSCodeUI_1.VSCodeUI.showTroubleshootingDialog(`Command "${commandName}" fails.`);
            throw error;
        }
    }));
    // tslint:disable-next-line:no-suspicious-comment
    // TODO: replace TelemetryWrapper.registerCommand with vscode.commands.registerCommand.
    context.subscriptions.push(vscode_extension_telemetry_wrapper_1.TelemetryWrapper.registerCommand(commandName, callbackWithTroubleshooting));
}
function doActivate(_operationId, context) {
    return __awaiter(this, void 0, void 0, function* () {
        yield vscode.commands.executeCommand("setContext", "mavenExtensionActivated", true);
        const provider = new MavenExplorerProvider_1.MavenExplorerProvider();
        context.subscriptions.push(vscode.window.registerTreeDataProvider("mavenProjects", provider));
        // pom.xml listener to refresh tree view
        const watcher = vscode.workspace.createFileSystemWatcher("**/pom.xml");
        watcher.onDidCreate(() => provider.refresh());
        watcher.onDidChange(() => provider.refresh());
        watcher.onDidDelete(() => provider.refresh());
        context.subscriptions.push(watcher);
        // register commands.
        ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal) => {
            registerCommand(context, `maven.goal.${goal}`, (node) => __awaiter(this, void 0, void 0, function* () {
                Utils_1.Utils.executeInTerminal(goal, node.pomPath);
            }));
        });
        registerCommand(context, "maven.project.refreshAll", () => {
            provider.refresh();
        });
        registerCommand(context, "maven.project.effectivePom", (node) => __awaiter(this, void 0, void 0, function* () {
            if (node instanceof vscode_1.Uri && node.fsPath) {
                yield Utils_1.Utils.showEffectivePom(node.fsPath);
            }
            else if (node instanceof MavenProjectNode_1.MavenProjectNode && node.pomPath) {
                yield Utils_1.Utils.showEffectivePom(node.pomPath);
            }
        }));
        registerCommand(context, "maven.goal.custom", (node) => __awaiter(this, void 0, void 0, function* () {
            if (node && node.pomPath) {
                yield Utils_1.Utils.excuteCustomGoal(node.pomPath);
            }
        }));
        registerCommand(context, "maven.project.openPom", (node) => __awaiter(this, void 0, void 0, function* () {
            if (node && node.pomPath) {
                yield VSCodeUI_1.VSCodeUI.openFileIfExists(node.pomPath);
            }
        }));
        registerCommand(context, "maven.archetype.generate", (entry) => __awaiter(this, void 0, void 0, function* () {
            yield ArchetypeModule_1.ArchetypeModule.generateFromArchetype(entry);
        }));
        registerCommand(context, "maven.archetype.update", () => __awaiter(this, void 0, void 0, function* () {
            yield vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p) => __awaiter(this, void 0, void 0, function* () {
                p.report({ message: "updating archetype catalog ..." });
                yield ArchetypeModule_1.ArchetypeModule.updateArchetypeCatalog();
                p.report({ message: "finished." });
            }));
        }));
        registerCommand(context, "maven.history", (item) => __awaiter(this, void 0, void 0, function* () {
            if (item) {
                yield Utils_1.Utils.executeHistoricalGoals([item.pomPath]);
            }
            else {
                yield Utils_1.Utils.executeHistoricalGoals(provider.mavenProjectNodes.map(_node => _node.pomPath));
            }
        }));
        registerCommand(context, "maven.goal.execute", () => __awaiter(this, void 0, void 0, function* () {
            yield Utils_1.Utils.executeMavenCommand(provider);
        }));
        context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal) => {
            VSCodeUI_1.VSCodeUI.mavenTerminal.onDidCloseTerminal(closedTerminal);
        }));
        // configuration change listener
        vscode.workspace.onDidChangeConfiguration((e) => {
            // close all terminals with outdated JAVA related Envs
            if (e.affectsConfiguration("maven.terminal.useJavaHome") || e.affectsConfiguration("maven.terminal.customEnv")) {
                VSCodeUI_1.VSCodeUI.mavenTerminal.closeAllTerminals();
            }
            else {
                const useJavaHome = Settings_1.Settings.Terminal.useJavaHome();
                if (useJavaHome && e.affectsConfiguration("java.home")) {
                    VSCodeUI_1.VSCodeUI.mavenTerminal.closeAllTerminals();
                }
            }
        });
        // workspace folder change listener
        vscode.workspace.onDidChangeWorkspaceFolders((_e) => {
            provider.refresh();
        });
    });
}
//# sourceMappingURL=extension.js.map