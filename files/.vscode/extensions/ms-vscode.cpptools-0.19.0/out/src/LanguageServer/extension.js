'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const os = require("os");
const fs = require("fs");
const util = require("../common");
const telemetry = require("../telemetry");
const ui_1 = require("./ui");
const clientCollection_1 = require("./clientCollection");
const settings_1 = require("./settings");
const persistentState_1 = require("./persistentState");
const languageConfig_1 = require("./languageConfig");
const customProviders_1 = require("./customProviders");
const platform_1 = require("../platform");
const vscode_languageclient_1 = require("vscode-languageclient");
const child_process_1 = require("child_process");
const tmp = require("tmp");
const githubAPI_1 = require("../githubAPI");
let prevCrashFile;
let clients;
let activeDocument;
let ui;
let disposables = [];
let languageConfigurations = [];
let intervalTimer;
let insiderUpdateTimer;
let realActivationOccurred = false;
let tempCommands = [];
let activatedPreviously;
const insiderUpdateTimerInterval = 1000 * 60 * 60;
function activate(activationEventOccurred) {
    console.log("activating extension");
    activatedPreviously = new persistentState_1.PersistentWorkspaceState("activatedPreviously", false);
    if (activatedPreviously.Value) {
        activatedPreviously.Value = false;
        realActivation();
    }
    registerCommands();
    tempCommands.push(vscode.workspace.onDidOpenTextDocument(d => onDidOpenTextDocument(d)));
    if (activationEventOccurred) {
        onActivationEvent();
        return;
    }
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        for (let i = 0; i < vscode.workspace.workspaceFolders.length; ++i) {
            let config = path.join(vscode.workspace.workspaceFolders[i].uri.fsPath, ".vscode/c_cpp_properties.json");
            if (fs.existsSync(config)) {
                onActivationEvent();
                return;
            }
        }
    }
    if (vscode.workspace.textDocuments !== undefined && vscode.workspace.textDocuments.length > 0) {
        for (let i = 0; i < vscode.workspace.textDocuments.length; ++i) {
            let document = vscode.workspace.textDocuments[i];
            if (document.languageId === "cpp" || document.languageId === "c") {
                onActivationEvent();
                return;
            }
        }
    }
}
exports.activate = activate;
function onDidOpenTextDocument(document) {
    if (document.languageId === "c" || document.languageId === "cpp") {
        onActivationEvent();
    }
}
function onActivationEvent() {
    if (tempCommands.length === 0) {
        return;
    }
    tempCommands.forEach((command) => {
        command.dispose();
    });
    tempCommands = [];
    if (!realActivationOccurred) {
        realActivation();
    }
    activatedPreviously.Value = true;
}
function realActivation() {
    realActivationOccurred = true;
    console.log("starting language server");
    clients = new clientCollection_1.ClientCollection();
    ui = ui_1.getUI();
    if (vscode.workspace.textDocuments !== undefined && vscode.workspace.textDocuments.length > 0) {
        onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
    }
    clients.forEach(client => {
        customProviders_1.getCustomConfigProviders().forEach(provider => client.onRegisterCustomConfigurationProvider(provider));
    });
    disposables.push(vscode.workspace.onDidChangeConfiguration(onDidChangeSettings));
    disposables.push(vscode.workspace.onDidSaveTextDocument(onDidSaveTextDocument));
    disposables.push(vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor));
    disposables.push(vscode.window.onDidChangeTextEditorSelection(onDidChangeTextEditorSelection));
    disposables.push(vscode.window.onDidChangeVisibleTextEditors(onDidChangeVisibleTextEditors));
    updateLanguageConfigurations();
    reportMacCrashes();
    const settings = new settings_1.CppSettings(clients.ActiveClient.RootUri);
    if (settings.updateChannel === 'Insiders') {
        insiderUpdateTimer = setInterval(checkAndApplyUpdate, insiderUpdateTimerInterval, settings.updateChannel);
        checkAndApplyUpdate(settings.updateChannel);
    }
    intervalTimer = setInterval(onInterval, 2500);
}
function updateLanguageConfigurations() {
    languageConfigurations.forEach(d => d.dispose());
    languageConfigurations = [];
    languageConfigurations.push(vscode.languages.setLanguageConfiguration('c', languageConfig_1.getLanguageConfig('c', clients.ActiveClient.RootUri)));
    languageConfigurations.push(vscode.languages.setLanguageConfiguration('cpp', languageConfig_1.getLanguageConfig('cpp', clients.ActiveClient.RootUri)));
}
exports.updateLanguageConfigurations = updateLanguageConfigurations;
function onDidChangeSettings() {
    const changedActiveClientSettings = clients.ActiveClient.onDidChangeSettings();
    clients.forEach(client => client.onDidChangeSettings());
    const newUpdateChannel = changedActiveClientSettings['updateChannel'];
    if (newUpdateChannel) {
        if (newUpdateChannel === 'Default') {
            clearInterval(insiderUpdateTimer);
        }
        else if (newUpdateChannel === 'Insiders') {
            insiderUpdateTimer = setInterval(checkAndApplyUpdate, insiderUpdateTimerInterval);
        }
        checkAndApplyUpdate(newUpdateChannel);
    }
}
let saveMessageShown = false;
function onDidSaveTextDocument(doc) {
    if (!vscode.window.activeTextEditor || doc !== vscode.window.activeTextEditor.document || (doc.languageId !== "cpp" && doc.languageId !== "c")) {
        return;
    }
    if (!saveMessageShown && new settings_1.CppSettings(doc.uri).clangFormatOnSave) {
        saveMessageShown = true;
        vscode.window.showInformationMessage("\"C_Cpp.clang_format_formatOnSave\" has been removed. Please use \"editor.formatOnSave\" instead.");
    }
}
function onDidChangeActiveTextEditor(editor) {
    console.assert(clients !== undefined, "client should be available before active editor is changed");
    if (clients === undefined) {
        return;
    }
    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || (activeEditor.document.languageId !== "cpp" && activeEditor.document.languageId !== "c")) {
        activeDocument = "";
    }
    else {
        activeDocument = editor.document.uri.toString();
        clients.activeDocumentChanged(editor.document);
        clients.ActiveClient.selectionChanged(vscode_languageclient_1.Range.create(editor.selection.start, editor.selection.end));
    }
    ui.activeDocumentChanged();
}
function onDidChangeTextEditorSelection(event) {
    if (!event.textEditor || !vscode.window.activeTextEditor || event.textEditor.document.uri !== vscode.window.activeTextEditor.document.uri ||
        (event.textEditor.document.languageId !== "cpp" && event.textEditor.document.languageId !== "c")) {
        return;
    }
    if (activeDocument !== event.textEditor.document.uri.toString()) {
        activeDocument = event.textEditor.document.uri.toString();
        clients.activeDocumentChanged(event.textEditor.document);
        ui.activeDocumentChanged();
    }
    clients.ActiveClient.selectionChanged(vscode_languageclient_1.Range.create(event.selections[0].start, event.selections[0].end));
}
function onDidChangeVisibleTextEditors(editors) {
    clients.forEach(client => client.onDidChangeVisibleTextEditors(editors));
}
function onInterval() {
    clients.ActiveClient.onInterval();
}
function installVsix(vsixLocation, updateChannel) {
    return __awaiter(this, void 0, void 0, function* () {
        return platform_1.PlatformInformation.GetPlatformInformation().then((platformInfo) => {
            const vsCodeScriptPath = function (platformInfo) {
                if (platformInfo.platform === 'win32') {
                    const vsCodeBinName = path.basename(process.execPath);
                    let cmdFile;
                    if (vsCodeBinName === 'Code - Insiders.exe') {
                        cmdFile = 'code-insiders.cmd';
                    }
                    else {
                        cmdFile = 'code.cmd';
                    }
                    const vsCodeExeDir = path.dirname(process.execPath);
                    return '"' + path.join(vsCodeExeDir, 'bin', cmdFile) + '"';
                }
                else if (platformInfo.platform === 'darwin') {
                    return '"' + path.join(process.execPath, '..', '..', '..', '..', '..', 'Resources', 'app', 'bin', 'code') + '"';
                }
                else {
                    const vsCodeBinName = path.basename(process.execPath);
                    try {
                        const stdout = child_process_1.execSync('which ' + vsCodeBinName);
                        return stdout.toString().trim();
                    }
                    catch (error) {
                        return undefined;
                    }
                }
            }(platformInfo);
            if (!vsCodeScriptPath) {
                return Promise.reject(new Error('Failed to find VS Code script'));
            }
            return new Promise((resolve, reject) => {
                let process = child_process_1.spawn(vsCodeScriptPath, ['--install-extension', vsixLocation]);
                if (process.pid === undefined) {
                    reject(new Error('Failed to launch VS Code script process for installation'));
                    return;
                }
                const timer = setTimeout(() => {
                    process.kill();
                    reject(new Error('Failed to receive response from VS Code script process for installation within 10s.'));
                }, 10000);
                let sentOverride = false;
                process.stdout.on('data', () => {
                    if (sentOverride) {
                        return;
                    }
                    process.stdin.write('0\n');
                    sentOverride = true;
                    clearInterval(timer);
                    resolve();
                });
            });
        });
    });
}
function checkAndApplyUpdate(updateChannel) {
    return __awaiter(this, void 0, void 0, function* () {
        let logFailure = (error) => {
            telemetry.logLanguageServerEvent('installVsix', { 'error': error.message, 'success': 'false' });
        };
        const p = new Promise((resolve, reject) => {
            githubAPI_1.getTargetBuildInfo(updateChannel).then(buildInfo => {
                if (!buildInfo) {
                    resolve();
                    return;
                }
                tmp.file({ postfix: '.vsix' }, (err, vsixPath, fd, cleanupCallback) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        reject(new Error('Failed to create vsix file'));
                        return;
                    }
                    try {
                        yield util.downloadFileToDestination(buildInfo.downloadUrl, vsixPath)
                            .catch(() => { throw new Error('Failed to download VSIX package'); });
                        yield installVsix(vsixPath, updateChannel)
                            .catch((error) => { throw error; });
                    }
                    catch (error) {
                        reject(error);
                        return;
                    }
                    clearInterval(insiderUpdateTimer);
                    const message = `The C/C++ Extension has been updated to version ${buildInfo.name}. Please reload the window for the changes to take effect.`;
                    util.promptReloadWindow(message);
                    telemetry.logLanguageServerEvent('installVsix', { 'success': 'true' });
                    resolve();
                }));
            }, (error) => {
                logFailure(error);
                reject(error);
            });
        });
        yield p.catch((error) => {
            logFailure(error);
            throw error;
        });
    });
}
function registerCommands() {
    disposables.push(vscode.commands.registerCommand('C_Cpp.Navigate', onNavigate));
    disposables.push(vscode.commands.registerCommand('C_Cpp.GoToDeclaration', onGoToDeclaration));
    disposables.push(vscode.commands.registerCommand('C_Cpp.PeekDeclaration', onPeekDeclaration));
    disposables.push(vscode.commands.registerCommand('C_Cpp.SwitchHeaderSource', onSwitchHeaderSource));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ResetDatabase', onResetDatabase));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ConfigurationSelect', onSelectConfiguration));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ConfigurationProviderSelect', onSelectConfigurationProvider));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ConfigurationEdit', onEditConfiguration));
    disposables.push(vscode.commands.registerCommand('C_Cpp.AddToIncludePath', onAddToIncludePath));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ToggleErrorSquiggles', onToggleSquiggles));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ToggleSnippets', onToggleSnippets));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ToggleIncludeFallback', onToggleIncludeFallback));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ToggleDimInactiveRegions', onToggleDimInactiveRegions));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ShowReleaseNotes', onShowReleaseNotes));
    disposables.push(vscode.commands.registerCommand('C_Cpp.PauseParsing', onPauseParsing));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ResumeParsing', onResumeParsing));
    disposables.push(vscode.commands.registerCommand('C_Cpp.ShowParsingCommands', onShowParsingCommands));
    disposables.push(vscode.commands.registerCommand('C_Cpp.TakeSurvey', onTakeSurvey));
}
function onNavigate() {
    onActivationEvent();
    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    clients.ActiveClient.requestNavigationList(activeEditor.document).then((navigationList) => {
        ui.showNavigationOptions(navigationList);
    });
}
function onGoToDeclaration() {
    onActivationEvent();
    clients.ActiveClient.requestGoToDeclaration().then(() => vscode.commands.executeCommand("editor.action.goToDeclaration"));
}
function onPeekDeclaration() {
    onActivationEvent();
    clients.ActiveClient.requestGoToDeclaration().then(() => vscode.commands.executeCommand("editor.action.previewDeclaration"));
}
function onSwitchHeaderSource() {
    onActivationEvent();
    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document) {
        return;
    }
    if (activeEditor.document.languageId !== "cpp" && activeEditor.document.languageId !== "c") {
        return;
    }
    let rootPath = clients.ActiveClient.RootPath;
    let fileName = activeEditor.document.fileName;
    if (!rootPath) {
        rootPath = path.dirname(fileName);
    }
    clients.ActiveClient.requestSwitchHeaderSource(rootPath, fileName).then((targetFileName) => {
        vscode.workspace.openTextDocument(targetFileName).then((document) => {
            let foundEditor = false;
            vscode.window.visibleTextEditors.forEach((editor, index, array) => {
                if (editor.document === document && !foundEditor) {
                    foundEditor = true;
                    vscode.window.showTextDocument(document, editor.viewColumn);
                }
            });
            if (!foundEditor) {
                if (vscode.window.activeTextEditor !== undefined) {
                    vscode.window.showTextDocument(document, vscode.window.activeTextEditor.viewColumn);
                }
                else {
                    vscode.window.showTextDocument(document);
                }
            }
        });
    });
}
function selectClient() {
    if (clients.Count === 1) {
        return Promise.resolve(clients.ActiveClient);
    }
    else {
        return ui.showWorkspaces(clients.Names).then(key => {
            if (key !== "") {
                let client = clients.get(key);
                if (client) {
                    return client;
                }
                else {
                    console.assert("client not found");
                }
            }
            return Promise.reject("client not found");
        });
    }
}
function onResetDatabase() {
    onActivationEvent();
    selectClient().then(client => client.resetDatabase(), rejected => { });
}
function onSelectConfiguration() {
    onActivationEvent();
    if (!isFolderOpen()) {
        vscode.window.showInformationMessage('Open a folder first to select a configuration');
    }
    else {
        clients.ActiveClient.handleConfigurationSelectCommand();
    }
}
function onSelectConfigurationProvider() {
    onActivationEvent();
    if (!isFolderOpen()) {
        vscode.window.showInformationMessage('Open a folder first to select a configuration provider');
    }
    else {
        selectClient().then(client => client.handleConfigurationProviderSelectCommand(), rejected => { });
    }
}
function onEditConfiguration() {
    onActivationEvent();
    if (!isFolderOpen()) {
        vscode.window.showInformationMessage('Open a folder first to edit configurations');
    }
    else {
        selectClient().then(client => client.handleConfigurationEditCommand(), rejected => { });
    }
}
function onAddToIncludePath(path) {
    if (!isFolderOpen()) {
        vscode.window.showInformationMessage('Open a folder first to add to includePath');
    }
    else {
        clients.ActiveClient.handleAddToIncludePathCommand(path);
    }
}
function onToggleSquiggles() {
    onActivationEvent();
    let settings = new settings_1.CppSettings(clients.ActiveClient.RootUri);
    settings.toggleSetting("errorSquiggles", "Enabled", "Disabled");
}
function onToggleSnippets() {
    onActivationEvent();
    const snippetsCatName = "Snippets";
    let newPackageJson = util.getRawPackageJson();
    if (newPackageJson.categories.findIndex(cat => cat === snippetsCatName) === -1) {
        newPackageJson.categories.push(snippetsCatName);
        newPackageJson.contributes.snippets = [{ "language": "cpp", "path": "./cpp_snippets.json" }, { "language": "c", "path": "./cpp_snippets.json" }];
        fs.writeFile(util.getPackageJsonPath(), util.stringifyPackageJson(newPackageJson), () => {
            showReloadPrompt("Reload Window to finish enabling C++ snippets");
        });
    }
    else {
        let ndxCat = newPackageJson.categories.indexOf(snippetsCatName);
        if (ndxCat !== -1) {
            newPackageJson.categories.splice(ndxCat, 1);
        }
        delete newPackageJson.contributes.snippets;
        fs.writeFile(util.getPackageJsonPath(), util.stringifyPackageJson(newPackageJson), () => {
            showReloadPrompt("Reload Window to finish disabling C++ snippets");
        });
    }
}
function showReloadPrompt(msg) {
    let reload = "Reload";
    vscode.window.showInformationMessage(msg, reload).then(value => {
        if (value === reload) {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });
}
function onToggleIncludeFallback() {
    onActivationEvent();
    let settings = new settings_1.CppSettings(clients.ActiveClient.RootUri);
    settings.toggleSetting("intelliSenseEngineFallback", "Enabled", "Disabled");
}
function onToggleDimInactiveRegions() {
    onActivationEvent();
    let settings = new settings_1.CppSettings(clients.ActiveClient.RootUri);
    settings.update("dimInactiveRegions", !settings.dimInactiveRegions);
}
function onShowReleaseNotes() {
    onActivationEvent();
    util.showReleaseNotes();
}
function onPauseParsing() {
    onActivationEvent();
    selectClient().then(client => client.pauseParsing(), rejected => { });
}
function onResumeParsing() {
    onActivationEvent();
    selectClient().then(client => client.resumeParsing(), rejected => { });
}
function onShowParsingCommands() {
    onActivationEvent();
    selectClient().then(client => client.handleShowParsingCommands(), rejected => { });
}
function onTakeSurvey() {
    onActivationEvent();
    telemetry.logLanguageServerEvent("onTakeSurvey");
    let uri = vscode.Uri.parse(`https://www.research.net/r/VBVV6C6?o=${os.platform()}&m=${vscode.env.machineId}`);
    vscode.commands.executeCommand('vscode.open', uri);
}
function reportMacCrashes() {
    if (process.platform === "darwin") {
        prevCrashFile = "";
        let crashFolder = path.resolve(process.env.HOME, "Library/Logs/DiagnosticReports");
        fs.stat(crashFolder, (err, stats) => {
            let crashObject = {};
            if (err) {
                crashObject["fs.stat: err.code"] = err.code;
                telemetry.logLanguageServerEvent("MacCrash", crashObject, null);
                return;
            }
            try {
                fs.watch(crashFolder, (event, filename) => {
                    if (event !== "rename") {
                        return;
                    }
                    if (filename === prevCrashFile) {
                        return;
                    }
                    prevCrashFile = filename;
                    if (!filename.startsWith("Microsoft.VSCode.CPP.")) {
                        return;
                    }
                    setTimeout(() => {
                        fs.readFile(path.resolve(crashFolder, filename), 'utf8', (err, data) => {
                            if (err) {
                                fs.readFile(path.resolve(crashFolder, filename), 'utf8', handleCrashFileRead);
                                return;
                            }
                            handleCrashFileRead(err, data);
                        });
                    }, 5000);
                });
            }
            catch (e) {
            }
        });
    }
}
function handleCrashFileRead(err, data) {
    let crashObject = {};
    if (err) {
        crashObject["readFile: err.code"] = err.code;
        telemetry.logLanguageServerEvent("MacCrash", crashObject, null);
        return;
    }
    let startCrash = data.indexOf(" Crashed:");
    if (startCrash < 0) {
        startCrash = 0;
    }
    let endCrash = data.indexOf("Thread ", startCrash);
    if (endCrash < startCrash) {
        endCrash = data.length - 1;
    }
    data = data.substr(startCrash, endCrash - startCrash);
    if (data.length > 16384) {
        data = data.substr(0, 16384) + "...";
    }
    crashObject["CrashingThreadCallStack"] = data;
    telemetry.logLanguageServerEvent("MacCrash", crashObject, null);
}
function deactivate() {
    console.log("deactivating extension");
    telemetry.logLanguageServerEvent("LanguageServerShutdown");
    clearInterval(intervalTimer);
    clearInterval(insiderUpdateTimer);
    disposables.forEach(d => d.dispose());
    languageConfigurations.forEach(d => d.dispose());
    ui.dispose();
    return clients.dispose();
}
exports.deactivate = deactivate;
function isFolderOpen() {
    return vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0;
}
exports.isFolderOpen = isFolderOpen;
function getClients() {
    if (!realActivationOccurred) {
        realActivation();
    }
    return clients;
}
exports.getClients = getClients;
function getActiveClient() {
    if (!realActivationOccurred) {
        realActivation();
    }
    return clients.ActiveClient;
}
exports.getActiveClient = getActiveClient;
//# sourceMappingURL=extension.js.map