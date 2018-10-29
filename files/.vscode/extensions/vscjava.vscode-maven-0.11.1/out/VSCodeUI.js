"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
// tslint:disable-next-line:no-require-imports
const opn = require("opn");
const vscode_1 = require("vscode");
const Settings_1 = require("./Settings");
const Utils_1 = require("./Utils");
var VSCodeUI;
(function (VSCodeUI) {
    const TROUBLESHOOTING_LINK = "https://github.com/Microsoft/vscode-maven/blob/master/Troubleshooting.md";
    // output channel
    class MavenOutputChannel {
        constructor() {
            this.channel = vscode_1.window.createOutputChannel("Maven for Java");
        }
        appendLine(message, title) {
            if (title) {
                const simplifiedTime = (new Date()).toISOString().replace(/z|t/gi, " ").trim(); // YYYY-MM-DD HH:mm:ss.sss
                const hightlightingTitle = `[${title} ${simplifiedTime}]`;
                this.channel.appendLine(hightlightingTitle);
            }
            this.channel.appendLine(message);
        }
        append(message) {
            this.channel.append(message);
        }
        show() {
            this.channel.show();
        }
    }
    VSCodeUI.outputChannel = new MavenOutputChannel();
    // terminal
    class MavenTerminal {
        constructor() {
            this.terminals = {};
        }
        runInTerminal(command, options) {
            const defaultOptions = { addNewLine: true, name: "Maven" };
            const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
            if (this.terminals[name] === undefined) {
                this.terminals[name] = vscode_1.window.createTerminal({ name });
                setupEnvironment(this.terminals[name]);
            }
            this.terminals[name].show();
            if (cwd) {
                this.terminals[name].sendText(getCDCommand(cwd), true);
            }
            this.terminals[name].sendText(getCommand(command), addNewLine);
        }
        closeAllTerminals() {
            Object.keys(this.terminals).forEach((id) => {
                this.terminals[id].dispose();
                delete this.terminals[id];
            });
        }
        onDidCloseTerminal(closedTerminal) {
            try {
                delete this.terminals[closedTerminal.name];
            }
            catch (error) {
                // ignore it.
            }
        }
    }
    VSCodeUI.mavenTerminal = new MavenTerminal();
    function getCommand(cmd) {
        if (process.platform === "win32") {
            switch (Utils_1.Utils.currentWindowsShell()) {
                case 'PowerShell':
                    return `cmd /c ${cmd}`; // PowerShell
                default:
                    return cmd; // others, try using common one.
            }
        }
        else {
            return cmd;
        }
    }
    function getCDCommand(cwd) {
        if (process.platform === "win32") {
            switch (Utils_1.Utils.currentWindowsShell()) {
                case 'Git Bash':
                    return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
                case 'PowerShell':
                    return `cd "${cwd}"`; // PowerShell
                case 'Command Prompt':
                    return `cd /d "${cwd}"`; // CMD
                case 'WSL Bash':
                    return `cd "${Utils_1.Utils.toWSLPath(cwd)}"`; // WSL
                default:
                    return `cd "${cwd}"`; // Unknown, try using common one.
            }
        }
        else {
            return `cd "${cwd}"`;
        }
    }
    function setupEnvironment(terminal) {
        // do this first so it can be overridden if desired
        const customEnv = setJavaHomeIfAvailable(terminal);
        const environmentSettings = Settings_1.Settings.Terminal.customEnv();
        environmentSettings.forEach((s) => {
            if (terminal) {
                terminal.sendText(composeSetEnvironmentVariableCommand(s.environmentVariable, s.value), true);
            }
            customEnv[s.environmentVariable] = s.value;
        });
        return customEnv;
    }
    VSCodeUI.setupEnvironment = setupEnvironment;
    function setJavaHomeIfAvailable(terminal) {
        // Look for the java.home setting from the redhat.java extension.  We can reuse it
        // if it exists to avoid making the user configure it in two places.
        const javaHome = Settings_1.Settings.External.javaHome();
        const useJavaHome = Settings_1.Settings.Terminal.useJavaHome();
        if (useJavaHome && javaHome) {
            if (terminal) {
                terminal.sendText(composeSetEnvironmentVariableCommand("JAVA_HOME", javaHome), true);
            }
            return { JAVA_HOME: javaHome };
        }
        else {
            return {};
        }
    }
    function composeSetEnvironmentVariableCommand(variable, value) {
        if (process.platform === "win32") {
            switch (Utils_1.Utils.currentWindowsShell()) {
                case 'Git Bash':
                case 'WSL Bash':
                    return `export ${variable}="${value}"`; // Git Bash
                case 'PowerShell':
                    return `$Env:${variable}="${value}"`; // PowerShell
                case 'Command Prompt':
                    return `set ${variable}=${value}`; // CMD
                default:
                    return `set ${variable}=${value}`; // Unknown, try using common one.
            }
        }
        else {
            return `export ${variable}="${value}"`; // general linux
        }
    }
    // file chooser dialog
    function openDialogForFolder(customOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false
            };
            const result = yield vscode_1.window.showOpenDialog(Object.assign(options, customOptions));
            if (result && result.length) {
                return Promise.resolve(result[0]);
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    VSCodeUI.openDialogForFolder = openDialogForFolder;
    function openDialogForFile(customOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false
            };
            const result = yield vscode_1.window.showOpenDialog(Object.assign(options, customOptions));
            if (result && result.length) {
                return Promise.resolve(result[0]);
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    VSCodeUI.openDialogForFile = openDialogForFile;
    // editor
    function openFileIfExists(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield fs.pathExists(filepath)) {
                vscode_1.window.showTextDocument(vscode_1.Uri.file(filepath));
            }
        });
    }
    VSCodeUI.openFileIfExists = openFileIfExists;
    // Quick pick
    function getQuickPick(itemsSource, labelfunc, descfunc, detailfunc, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const itemWrappersPromise = new Promise((resolve, _reject) => __awaiter(this, void 0, void 0, function* () {
                const ret = (yield itemsSource).map((item) => Object.assign({}, {
                    description: (descfunc && descfunc(item)),
                    detail: (detailfunc && detailfunc(item)),
                    label: (labelfunc && labelfunc(item)),
                    value: item
                }));
                resolve(ret);
            }));
            const selected = yield vscode_1.window.showQuickPick(itemWrappersPromise, Object.assign({ ignoreFocusOut: true }, options));
            return selected && selected.value;
        });
    }
    VSCodeUI.getQuickPick = getQuickPick;
    // Inputbox
    function getFromInputBox(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield vscode_1.window.showInputBox(Object.assign({ ignoreFocusOut: true }, options));
        });
    }
    VSCodeUI.getFromInputBox = getFromInputBox;
    // Troubleshooting
    function showTroubleshootingDialog(errorMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            const OPTION_LEARN_MORE = "Learn more";
            const choiceForDetails = yield vscode_1.window.showErrorMessage(errorMessage, OPTION_LEARN_MORE);
            if (choiceForDetails === OPTION_LEARN_MORE) {
                // open FAQs
                opn(TROUBLESHOOTING_LINK);
            }
        });
    }
    VSCodeUI.showTroubleshootingDialog = showTroubleshootingDialog;
})(VSCodeUI = exports.VSCodeUI || (exports.VSCodeUI = {}));
//# sourceMappingURL=VSCodeUI.js.map