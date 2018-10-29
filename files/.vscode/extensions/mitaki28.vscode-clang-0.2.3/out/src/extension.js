"use strict";
const vscode = require("vscode");
const clang = require("./clang");
const configuration = require("./configuration");
const diagnostic = require("./diagnostic");
const completion = require("./completion");
const CLANG_MODE = [
    { language: "cpp", scheme: "file" },
    { language: "c", scheme: "file" },
    { language: "objective-c", scheme: "file" }
];
class ResidentExtension {
    constructor() {
        this.extensions = new Map();
        this.update();
    }
    _updateProvider(enable, name, create) {
        if (this.extensions.has(name)) {
            this.extensions.get(name).dispose();
            this.extensions.delete(name);
        }
        if (enable) {
            this.extensions.set(name, create());
        }
    }
    update() {
        this._updateProvider(clang.getConf("completion.enable"), "completion", () => {
            let triggers = clang.getConf("completion.triggerChars");
            let filteredTriggers = [];
            for (let t of triggers) {
                if (typeof t === "string" && t.length === 1) {
                    filteredTriggers.push(t);
                }
                else {
                    vscode.window.showErrorMessage(`length of trigger character must be 1. ${t} is ignored.`);
                }
            }
            return vscode.languages.registerCompletionItemProvider(CLANG_MODE, new completion.ClangCompletionItemProvider(), ...filteredTriggers);
        });
        this._updateProvider(clang.getConf("diagnostic.enable"), "diagnostic", () => diagnostic.registerDiagnosticProvider(CLANG_MODE, new diagnostic.ClangDiagnosticProvider, "clang"));
    }
    dispose() {
        for (let disposable of Array.from(this.extensions.values())) {
            disposable.dispose();
        }
    }
}
function activate(context) {
    let confViewer = new configuration.ConfigurationViewer;
    context.subscriptions.push(confViewer);
    context.subscriptions.push(vscode.commands.registerTextEditorCommand("clang.showExecConf", (editor, edit) => {
        if (!vscode.languages.match(CLANG_MODE, editor.document)) {
            vscode.window.showErrorMessage(`Current language is not C, C++ or Objective-C`);
            return;
        }
        confViewer.show(editor.document);
    }));
    let confTester = new configuration.ConfigurationTester;
    context.subscriptions.push(confTester);
    let subscriptions = [];
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor || !vscode.languages.match(CLANG_MODE, editor.document))
            return;
        confTester.test(editor.document.languageId);
    }, null, subscriptions);
    let residentExtension = new ResidentExtension();
    context.subscriptions.push(residentExtension);
    vscode.workspace.onDidChangeConfiguration(() => {
        residentExtension.update();
    }, null, subscriptions);
    context.subscriptions.push(vscode.Disposable.from(...subscriptions));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map