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
const vscode = require("vscode");
const commands = require("./commands");
class JavaDebugConfigurationProvider {
    constructor(_reporter) {
        this._reporter = _reporter;
        this.isUserSettingsDirty = true;
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (vscode.debug.activeDebugSession) {
                this.isUserSettingsDirty = false;
                return updateDebugSettings();
            }
            else {
                this.isUserSettingsDirty = true;
            }
        });
    }
    // Returns an initial debug configurations based on contextual information.
    provideDebugConfigurations(folder, token) {
        return this.provideDebugConfigurationsAsync(folder);
    }
    // Try to add all missing attributes to the debug configuration being launched.
    resolveDebugConfiguration(folder, config, token) {
        return this.heuristicallyResolveDebugConfiguration(folder, config);
    }
    provideDebugConfigurationsAsync(folder, token) {
        return vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p) => {
            return new Promise((resolve, reject) => {
                p.report({ message: "Auto generating configuration..." });
                resolveMainClass(folder ? folder.uri : undefined).then((res) => {
                    let cache;
                    cache = {};
                    const launchConfigs = res.map((item) => {
                        return {
                            type: "java",
                            name: this.constructLaunchConfigName(item.mainClass, item.projectName, cache),
                            request: "launch",
                            // tslint:disable-next-line
                            cwd: "${workspaceFolder}",
                            console: "internalConsole",
                            stopOnEntry: false,
                            mainClass: item.mainClass,
                            projectName: item.projectName,
                            args: "",
                        };
                    });
                    resolve([...launchConfigs, {
                            type: "java",
                            name: "Debug (Attach)",
                            request: "attach",
                            hostName: "localhost",
                            port: 0,
                        }]);
                }, (ex) => {
                    p.report({ message: `failed to generate configuration. ${ex}` });
                    reject(ex);
                });
            });
        });
    }
    constructLaunchConfigName(mainClass, projectName, cache) {
        const prefix = "Debug (Launch)-";
        let name = prefix + mainClass.substr(mainClass.lastIndexOf(".") + 1);
        if (projectName !== undefined) {
            name += `<${projectName}>`;
        }
        if (cache[name] === undefined) {
            cache[name] = 0;
            return name;
        }
        else {
            cache[name] += 1;
            return `${name}(${cache[name]})`;
        }
    }
    heuristicallyResolveDebugConfiguration(folder, config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.isUserSettingsDirty) {
                    this.isUserSettingsDirty = false;
                    yield updateDebugSettings();
                }
                if (Object.keys(config).length === 0) {
                    // check whether it is opened as a folder
                    if (folder !== undefined) {
                        // for opened with folder, return directly.
                        return config;
                    }
                    // only rebuild for single file case before the build error issue is resolved.
                    try {
                        const buildResult = yield vscode.commands.executeCommand(commands.JAVA_BUILD_WORKSPACE, false);
                        console.log(buildResult);
                    }
                    catch (err) {
                        const ans = yield vscode.window.showErrorMessage("Build failed, do you want to continue?", "Proceed", "Abort");
                        if (ans !== "Proceed") {
                            return undefined;
                        }
                    }
                    // Generate config in memory for single file
                    config.type = "java";
                    config.name = "Java Debug";
                    config.request = "launch";
                }
                if (config.request === "launch") {
                    if (!config.mainClass) {
                        const res = (yield resolveMainClass(folder ? folder.uri : undefined));
                        if (res.length === 0) {
                            vscode.window.showErrorMessage("Cannot resolve main class automatically, please specify the mainClass " +
                                "(e.g. [mymodule/]com.xyz.MainClass) in the launch.json.");
                            return;
                        }
                        const pickItems = res.map((item) => {
                            let name = item.mainClass;
                            let details = `main class: ${item.mainClass}`;
                            if (item.projectName !== undefined) {
                                name += `<${item.projectName}>`;
                                details += ` | project name: ${item.projectName}`;
                            }
                            return {
                                description: details,
                                label: name,
                                item,
                            };
                        }).sort((a, b) => {
                            return a.label > b.label ? 1 : -1;
                        });
                        const selection = yield vscode.window.showQuickPick(pickItems, { placeHolder: "Select main class<project name>" });
                        if (selection) {
                            config.mainClass = selection.item.mainClass;
                            config.projectName = selection.item.projectName;
                        }
                        else {
                            vscode.window.showErrorMessage("Please specify the mainClass (e.g. [mymodule/]com.xyz.MainClass) in the launch.json.");
                            this.log("usageError", "Please specify the mainClass (e.g. [mymodule/]com.xyz.MainClass) in the launch.json.");
                            return undefined;
                        }
                    }
                    if (this.isEmptyArray(config.classPaths) && this.isEmptyArray(config.modulePaths)) {
                        const result = (yield resolveClasspath(config.mainClass, config.projectName));
                        config.modulePaths = result[0];
                        config.classPaths = result[1];
                    }
                    if (this.isEmptyArray(config.classPaths) && this.isEmptyArray(config.modulePaths)) {
                        const hintMessage = "Cannot resolve the modulepaths/classpaths automatically, please specify the value in the launch.json.";
                        vscode.window.showErrorMessage(hintMessage);
                        this.log("usageError", hintMessage);
                        return undefined;
                    }
                }
                else if (config.request === "attach") {
                    if (!config.hostName || !config.port) {
                        vscode.window.showErrorMessage("Please specify the host name and the port of the remote debuggee in the launch.json.");
                        this.log("usageError", "Please specify the host name and the port of the remote debuggee in the launch.json.");
                        return undefined;
                    }
                }
                else {
                    const ans = yield vscode.window.showErrorMessage(
                    // tslint:disable-next-line:max-line-length
                    "Request type \"" + config.request + "\" is not supported. Only \"launch\" and \"attach\" are supported.", "Open launch.json");
                    if (ans === "Open launch.json") {
                        yield vscode.commands.executeCommand(commands.VSCODE_ADD_DEBUGCONFIGURATION);
                    }
                    this.log("usageError", "Illegal request type in launch.json");
                    return undefined;
                }
                const debugServerPort = yield startDebugSession();
                if (debugServerPort) {
                    config.debugServer = debugServerPort;
                    return config;
                }
                else {
                    this.log("exception", "Failed to start debug server.");
                    // Information for diagnostic:
                    console.log("Cannot find a port for debugging session");
                    return undefined;
                }
            }
            catch (ex) {
                const errorMessage = (ex && ex.message) || ex;
                vscode.window.showErrorMessage(String(errorMessage));
                if (this._reporter) {
                    const exception = (ex && ex.data && ex.data.cause)
                        || { stackTrace: [], detailMessage: String((ex && ex.message) || ex || "Unknown exception") };
                    const properties = {
                        message: "",
                        stackTrace: "",
                    };
                    if (exception && typeof exception === "object") {
                        properties.message = exception.detailMessage;
                        properties.stackTrace = (Array.isArray(exception.stackTrace) && JSON.stringify(exception.stackTrace))
                            || String(exception.stackTrace);
                    }
                    else {
                        properties.message = String(exception);
                    }
                    this._reporter.sendTelemetryEvent("exception", properties);
                }
                return undefined;
            }
        });
    }
    log(type, message) {
        if (this._reporter) {
            this._reporter.sendTelemetryEvent(type, { message });
        }
    }
    isEmptyArray(configItems) {
        return !Array.isArray(configItems) || !configItems.length;
    }
}
exports.JavaDebugConfigurationProvider = JavaDebugConfigurationProvider;
function startDebugSession() {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_START_DEBUGSESSION);
}
function resolveClasspath(mainClass, projectName) {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_CLASSPATH, mainClass, projectName);
}
function resolveMainClass(workspaceUri) {
    if (workspaceUri) {
        return commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_MAINCLASS, workspaceUri.toString());
    }
    return commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_MAINCLASS);
}
function updateDebugSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        const debugSettingsRoot = vscode.workspace.getConfiguration("java.debug");
        if (!debugSettingsRoot) {
            return;
        }
        const logLevel = convertLogLevel(debugSettingsRoot.logLevel || "");
        if (debugSettingsRoot.settings && Object.keys(debugSettingsRoot.settings).length) {
            try {
                console.log("settings:", yield commands.executeJavaLanguageServerCommand(commands.JAVA_UPDATE_DEBUG_SETTINGS, JSON.stringify(Object.assign({}, debugSettingsRoot.settings, { logLevel }))));
            }
            catch (err) {
                // log a warning message and continue, since update settings failure should not block debug session
                console.log("Cannot update debug settings.", err);
            }
        }
    });
}
function convertLogLevel(commonLogLevel) {
    // convert common log level to java log level
    switch (commonLogLevel.toLowerCase()) {
        case "verbose":
            return "FINE";
        case "warn":
            return "WARNING";
        case "error":
            return "SEVERE";
        case "info":
            return "INFO";
        default:
            return "FINE";
    }
}
//# sourceMappingURL=configurationProvider.js.map