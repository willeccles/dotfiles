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
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const plugin_1 = require("./plugin");
const javaServerStarter_1 = require("./javaServerStarter");
const requirements = require("./requirements");
const commands_1 = require("./commands");
const protocol_1 = require("./protocol");
let os = require('os');
let oldConfig;
let lastStatus;
function activate(context) {
    enableJavadocSymbols();
    return requirements.resolveRequirements().catch(error => {
        //show error
        vscode_1.window.showErrorMessage(error.message, error.label).then((selection) => {
            if (error.label && error.label === selection && error.openUrl) {
                vscode_1.commands.executeCommand(commands_1.Commands.OPEN_BROWSER, error.openUrl);
            }
        });
        // rethrow to disrupt the chain.
        throw error;
    }).then(requirements => {
        return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Window }, p => {
            return new Promise((resolve, reject) => {
                let storagePath = context.storagePath;
                if (!storagePath) {
                    storagePath = getTempWorkspace();
                }
                let workspacePath = path.resolve(storagePath + '/jdt_ws');
                // Options to control the language client
                let clientOptions = {
                    // Register the server for java
                    documentSelector: ['java'],
                    synchronize: {
                        configurationSection: 'java',
                        // Notify the server about file changes to .java and project/build files contained in the workspace
                        fileEvents: [
                            vscode_1.workspace.createFileSystemWatcher('**/*.java'),
                            vscode_1.workspace.createFileSystemWatcher('**/pom.xml'),
                            vscode_1.workspace.createFileSystemWatcher('**/*.gradle'),
                            vscode_1.workspace.createFileSystemWatcher('**/.project'),
                            vscode_1.workspace.createFileSystemWatcher('**/.classpath'),
                            vscode_1.workspace.createFileSystemWatcher('**/settings/*.prefs')
                        ],
                    },
                    initializationOptions: {
                        bundles: plugin_1.collectionJavaExtensions(vscode_1.extensions.all),
                        workspaceFolders: vscode_1.workspace.workspaceFolders ? vscode_1.workspace.workspaceFolders.map(f => f.uri.toString()) : null
                    },
                    revealOutputChannelOn: vscode_languageclient_1.RevealOutputChannelOn.Never
                };
                let item = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Right, Number.MIN_VALUE);
                item.text = '$(rocket)';
                item.command = commands_1.Commands.OPEN_OUTPUT;
                oldConfig = getJavaConfiguration();
                let serverOptions;
                let port = process.env['SERVER_PORT'];
                if (!port) {
                    serverOptions = javaServerStarter_1.prepareExecutable(requirements, workspacePath, getJavaConfiguration());
                }
                else {
                    // used during development
                    serverOptions = javaServerStarter_1.awaitServerConnection.bind(null, port);
                }
                // Create the language client and start the client.
                let languageClient = new vscode_languageclient_1.LanguageClient('java', 'Language Support for Java', serverOptions, clientOptions);
                languageClient.registerProposedFeatures();
                languageClient.onReady().then(() => {
                    languageClient.onNotification(protocol_1.StatusNotification.type, (report) => {
                        switch (report.type) {
                            case 'Started':
                                item.text = '$(thumbsup)';
                                p.report({ message: 'Finished' });
                                lastStatus = item.text;
                                resolve();
                                break;
                            case 'Error':
                                item.text = '$(thumbsdown)';
                                lastStatus = item.text;
                                p.report({ message: 'Finished with Error' });
                                item.tooltip = report.message;
                                toggleItem(vscode_1.window.activeTextEditor, item);
                                resolve();
                                break;
                            case 'Starting':
                                p.report({ message: report.message });
                                item.tooltip = report.message;
                                break;
                            case 'Message':
                                item.text = report.message;
                                setTimeout(() => { item.text = lastStatus; }, 3000);
                                break;
                        }
                        item.tooltip = report.message;
                        toggleItem(vscode_1.window.activeTextEditor, item);
                    });
                    languageClient.onNotification(protocol_1.ActionableNotification.type, (notification) => {
                        let show = null;
                        switch (notification.severity) {
                            case protocol_1.MessageType.Log:
                                show = logNotification;
                                break;
                            case protocol_1.MessageType.Info:
                                show = vscode_1.window.showInformationMessage;
                                break;
                            case protocol_1.MessageType.Warning:
                                show = vscode_1.window.showWarningMessage;
                                break;
                            case protocol_1.MessageType.Error:
                                show = vscode_1.window.showErrorMessage;
                                break;
                        }
                        if (!show) {
                            return;
                        }
                        const titles = notification.commands.map(a => a.title);
                        show(notification.message, ...titles).then((selection) => {
                            for (let action of notification.commands) {
                                if (action.title === selection) {
                                    let args = (action.arguments) ? action.arguments : [];
                                    vscode_1.commands.executeCommand(action.command, ...args);
                                    break;
                                }
                            }
                        });
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.OPEN_OUTPUT, () => {
                        languageClient.outputChannel.show(vscode_1.ViewColumn.Three);
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.SHOW_JAVA_REFERENCES, (uri, position, locations) => {
                        vscode_1.commands.executeCommand(commands_1.Commands.SHOW_REFERENCES, vscode_1.Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position), locations.map(languageClient.protocol2CodeConverter.asLocation));
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.SHOW_JAVA_IMPLEMENTATIONS, (uri, position, locations) => {
                        vscode_1.commands.executeCommand(commands_1.Commands.SHOW_REFERENCES, vscode_1.Uri.parse(uri), languageClient.protocol2CodeConverter.asPosition(position), locations.map(languageClient.protocol2CodeConverter.asLocation));
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.CONFIGURATION_UPDATE, uri => projectConfigurationUpdate(languageClient, uri));
                    vscode_1.commands.registerCommand(commands_1.Commands.IGNORE_INCOMPLETE_CLASSPATH, (data) => setIncompleteClasspathSeverity('ignore'));
                    vscode_1.commands.registerCommand(commands_1.Commands.IGNORE_INCOMPLETE_CLASSPATH_HELP, (data) => {
                        vscode_1.commands.executeCommand(commands_1.Commands.OPEN_BROWSER, vscode_1.Uri.parse('https://github.com/redhat-developer/vscode-java/wiki/%22Classpath-is-incomplete%22-warning'));
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.PROJECT_CONFIGURATION_STATUS, (uri, status) => setProjectConfigurationUpdate(languageClient, uri, status));
                    vscode_1.commands.registerCommand(commands_1.Commands.APPLY_WORKSPACE_EDIT, (obj) => {
                        applyWorkspaceEdit(obj);
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.EDIT_ORGANIZE_IMPORTS, () => __awaiter(this, void 0, void 0, function* () {
                        let activeEditor = vscode_1.window.activeTextEditor;
                        if (!activeEditor || !activeEditor.document || activeEditor.document.languageId !== 'java') {
                            return;
                        }
                        if (activeEditor.document.uri instanceof vscode_1.Uri) {
                            const obj = yield vscode_1.commands.executeCommand(commands_1.Commands.EXECUTE_WORKSPACE_COMMAND, commands_1.Commands.EDIT_ORGANIZE_IMPORTS, activeEditor.document.uri.toString());
                            applyWorkspaceEdit(obj);
                        }
                    }));
                    vscode_1.commands.registerCommand(commands_1.Commands.EXECUTE_WORKSPACE_COMMAND, (command, ...rest) => {
                        const params = {
                            command,
                            arguments: rest
                        };
                        return languageClient.sendRequest(vscode_languageclient_1.ExecuteCommandRequest.type, params);
                    });
                    vscode_1.commands.registerCommand(commands_1.Commands.COMPILE_WORKSPACE, (isFullCompile) => {
                        return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Window }, (p) => __awaiter(this, void 0, void 0, function* () {
                            if (typeof isFullCompile !== 'boolean') {
                                const selection = yield vscode_1.window.showQuickPick(['Incremental', 'Full'], { 'placeHolder': 'please choose compile type:' });
                                isFullCompile = selection !== 'Incremental';
                            }
                            p.report({ message: 'Compiling workspace...' });
                            const start = new Date().getTime();
                            const res = yield languageClient.sendRequest(protocol_1.CompileWorkspaceRequest.type, isFullCompile);
                            const elapsed = new Date().getTime() - start;
                            const humanVisibleDelay = elapsed < 1000 ? 1000 : 0;
                            return new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    if (res === protocol_1.CompileWorkspaceStatus.SUCCEED) {
                                        resolve(res);
                                    }
                                    else {
                                        reject(res);
                                    }
                                }, humanVisibleDelay);
                            });
                        }));
                    });
                    vscode_1.window.onDidChangeActiveTextEditor((editor) => {
                        toggleItem(editor, item);
                    });
                    let provider = {
                        onDidChange: null,
                        provideTextDocumentContent: (uri, token) => {
                            return languageClient.sendRequest(protocol_1.ClassFileContentsRequest.type, { uri: uri.toString() }, token).then((v) => {
                                return v || '';
                            });
                        }
                    };
                    vscode_1.workspace.registerTextDocumentContentProvider('jdt', provider);
                });
                let disposable = languageClient.start();
                // Register commands here to make it available even when the language client fails
                vscode_1.commands.registerCommand(commands_1.Commands.OPEN_SERVER_LOG, () => openServerLogFile(workspacePath));
                // Push the disposable to the context's subscriptions so that the
                // client can be deactivated on extension deactivation
                context.subscriptions.push(disposable);
                context.subscriptions.push(onConfigurationChange());
                toggleItem(vscode_1.window.activeTextEditor, item);
                function applyWorkspaceEdit(obj) {
                    let edit = languageClient.protocol2CodeConverter.asWorkspaceEdit(obj);
                    if (edit) {
                        vscode_1.workspace.applyEdit(edit);
                    }
                }
            });
        });
    });
}
exports.activate = activate;
function enableJavadocSymbols() {
    // Let's enable Javadoc symbols autocompletion, shamelessly copied from MIT licensed code at
    // https://github.com/Microsoft/vscode/blob/9d611d4dfd5a4a101b5201b8c9e21af97f06e7a7/extensions/typescript/src/typescriptMain.ts#L186
    vscode_1.languages.setLanguageConfiguration('java', {
        indentationRules: {
            // ^(.*\*/)?\s*\}.*$
            decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
            // ^.*\{[^}"']*$
            increaseIndentPattern: /^.*\{[^}"']*$/
        },
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        onEnterRules: [
            {
                // e.g. /** | */
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                afterText: /^\s*\*\/$/,
                action: { indentAction: vscode_1.IndentAction.IndentOutdent, appendText: ' * ' }
            },
            {
                // e.g. /** ...|
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                action: { indentAction: vscode_1.IndentAction.None, appendText: ' * ' }
            },
            {
                // e.g.  * ...|
                beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
                action: { indentAction: vscode_1.IndentAction.None, appendText: '* ' }
            },
            {
                // e.g.  */|
                beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
                action: { indentAction: vscode_1.IndentAction.None, removeText: 1 }
            },
            {
                // e.g.  *-----*/|
                beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
                action: { indentAction: vscode_1.IndentAction.None, removeText: 1 }
            }
        ]
    });
}
function logNotification(message, ...items) {
    return new Promise((resolve, reject) => {
        console.log(message);
    });
}
function setIncompleteClasspathSeverity(severity) {
    const config = getJavaConfiguration();
    const section = 'errors.incompleteClasspath.severity';
    config.update(section, severity, true).then(() => console.log(section + ' globally set to ' + severity), (error) => console.log(error));
}
function projectConfigurationUpdate(languageClient, uri) {
    let resource = uri;
    if (!(resource instanceof vscode_1.Uri)) {
        if (vscode_1.window.activeTextEditor) {
            resource = vscode_1.window.activeTextEditor.document.uri;
        }
    }
    if (!resource) {
        return vscode_1.window.showWarningMessage('No Java project to update!').then(() => false);
    }
    if (isJavaConfigFile(resource.path)) {
        languageClient.sendNotification(protocol_1.ProjectConfigurationUpdateRequest.type, {
            uri: resource.toString()
        });
    }
}
function setProjectConfigurationUpdate(languageClient, uri, status) {
    const config = getJavaConfiguration();
    const section = 'configuration.updateBuildConfiguration';
    const st = protocol_1.FeatureStatus[status];
    config.update(section, st).then(() => console.log(section + ' set to ' + st), (error) => console.log(error));
    if (status !== protocol_1.FeatureStatus.disabled) {
        projectConfigurationUpdate(languageClient, uri);
    }
}
function toggleItem(editor, item) {
    if (editor && editor.document &&
        (editor.document.languageId === 'java' || isJavaConfigFile(editor.document.uri.path))) {
        item.show();
    }
    else {
        item.hide();
    }
}
function isJavaConfigFile(path) {
    return path.endsWith('pom.xml') || path.endsWith('.gradle');
}
function onConfigurationChange() {
    return vscode_1.workspace.onDidChangeConfiguration(params => {
        let newConfig = getJavaConfiguration();
        if (hasJavaConfigChanged(oldConfig, newConfig)) {
            let msg = 'Java Language Server configuration changed, please restart VS Code.';
            let action = 'Restart Now';
            let restartId = commands_1.Commands.RELOAD_WINDOW;
            oldConfig = newConfig;
            vscode_1.window.showWarningMessage(msg, action).then((selection) => {
                if (action === selection) {
                    vscode_1.commands.executeCommand(restartId);
                }
            });
        }
    });
}
function hasJavaConfigChanged(oldConfig, newConfig) {
    return hasConfigKeyChanged('home', oldConfig, newConfig)
        || hasConfigKeyChanged('jdt.ls.vmargs', oldConfig, newConfig);
}
function hasConfigKeyChanged(key, oldConfig, newConfig) {
    return oldConfig.get(key) !== newConfig.get(key);
}
function getTempWorkspace() {
    return path.resolve(os.tmpdir(), 'vscodesws_' + makeRandomHexString(5));
}
function makeRandomHexString(length) {
    let chars = ['0', '1', '2', '3', '4', '5', '6', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    let result = '';
    for (let i = 0; i < length; i++) {
        let idx = Math.floor(chars.length * Math.random());
        result += chars[idx];
    }
    return result;
}
function getJavaConfiguration() {
    return vscode_1.workspace.getConfiguration('java');
}
function openServerLogFile(workspacePath) {
    let serverLogFile = path.join(workspacePath, '.metadata', '.log');
    if (!serverLogFile) {
        return vscode_1.window.showWarningMessage('Java Language Server has not started logging.').then(() => false);
    }
    return vscode_1.workspace.openTextDocument(serverLogFile)
        .then(doc => {
        if (!doc) {
            return false;
        }
        return vscode_1.window.showTextDocument(doc, vscode_1.window.activeTextEditor ?
            vscode_1.window.activeTextEditor.viewColumn : undefined)
            .then(editor => !!editor);
    }, () => false)
        .then(didOpen => {
        if (!didOpen) {
            vscode_1.window.showWarningMessage('Could not open Java Language Server log file');
        }
        return didOpen;
    });
}
//# sourceMappingURL=extension.js.map