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
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
const _ = require("lodash");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const anchor = require("./anchor");
const commands = require("./commands");
const logger_1 = require("./logger");
const utility = require("./utility");
const variableResolver_1 = require("./variableResolver");
class JavaDebugConfigurationProvider {
    constructor() {
        this.isUserSettingsDirty = true;
        this.debugHistory = new MostRecentlyUsedHistory();
        this.resolver = new variableResolver_1.VariableResolver();
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
        const provideDebugConfigurationsHandler = vscode_extension_telemetry_wrapper_1.instrumentOperation("provideDebugConfigurations", (operationId) => {
            return this.provideDebugConfigurationsAsync(folder);
        });
        return provideDebugConfigurationsHandler();
    }
    // Try to add all missing attributes to the debug configuration being launched.
    resolveDebugConfiguration(folder, config, token) {
        const resolveDebugConfigurationHandler = vscode_extension_telemetry_wrapper_1.instrumentOperation("resolveDebugConfiguration", (operationId) => {
            this.resolveVariables(folder, config);
            return this.heuristicallyResolveDebugConfiguration(folder, config);
        });
        return resolveDebugConfigurationHandler();
    }
    provideDebugConfigurationsAsync(folder, token) {
        return vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, (p) => {
            return new Promise((resolve, reject) => {
                p.report({ message: "Auto generating configuration..." });
                resolveMainClass(folder ? folder.uri : undefined).then((res) => {
                    let cache;
                    cache = {};
                    const defaultLaunchConfig = {
                        type: "java",
                        name: "Debug (Launch)",
                        request: "launch",
                        // tslint:disable-next-line
                        cwd: "${workspaceFolder}",
                        console: "internalConsole",
                        stopOnEntry: false,
                        mainClass: "",
                        args: "",
                    };
                    const launchConfigs = res.map((item) => {
                        return Object.assign({}, defaultLaunchConfig, { name: this.constructLaunchConfigName(item.mainClass, item.projectName, cache), mainClass: item.mainClass, projectName: item.projectName });
                    });
                    const defaultAttachConfig = {
                        type: "java",
                        name: "Debug (Attach)",
                        request: "attach",
                        hostName: "localhost",
                        port: "<debug port of remote debuggee>",
                    };
                    resolve([defaultLaunchConfig, ...launchConfigs, defaultAttachConfig]);
                }, (ex) => {
                    p.report({ message: `failed to generate configuration. ${ex}` });
                    reject(ex);
                });
            });
        });
    }
    resolveVariables(folder, config) {
        // all the properties whose values are string or array of string
        const keys = ["mainClass", "args", "vmArgs", "modulePaths", "classPaths", "projectName",
            "env", "sourcePaths", "encoding", "cwd", "hostName"];
        if (!config) {
            return;
        }
        for (const key of keys) {
            if (config.hasOwnProperty(key)) {
                const value = config[key];
                if (_.isString(value)) {
                    config[key] = this.resolver.resolveString(folder ? folder.uri : undefined, value);
                }
                else if (_.isArray(value)) {
                    config[key] = _.map(value, (item) => _.isString(item) ? this.resolver.resolveString(folder ? folder.uri : undefined, item) : item);
                }
            }
        }
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
                /**
                 * If no launch.json exists in the current workspace folder
                 * delegate to provideDebugConfigurations api to generate the initial launch.json configurations
                 */
                if (this.isEmptyConfig(config) && folder) {
                    // Follow the feature request https://github.com/Microsoft/vscode/issues/54213#issuecomment-420965778,
                    // in order to generate launch.json, the resolveDebugConfiguration api must return null explicitly.
                    return null;
                }
                // If it's the single file case that no workspace folder is opened, generate debug config in memory
                if (this.isEmptyConfig(config) && !folder) {
                    config.type = "java";
                    config.name = "Java Debug";
                    config.request = "launch";
                }
                if (config.request === "launch") {
                    try {
                        const buildResult = yield vscode.commands.executeCommand(commands.JAVA_BUILD_WORKSPACE, false);
                    }
                    catch (err) {
                        const ans = yield utility.showErrorMessageWithTroubleshooting({
                            message: "Build failed, do you want to continue?",
                            type: logger_1.Type.USAGEERROR,
                            anchor: anchor.BUILD_FAILED,
                        }, "Proceed", "Abort");
                        if (ans !== "Proceed") {
                            return undefined;
                        }
                    }
                    const mainClassOption = yield this.resolveLaunchConfig(folder ? folder.uri : undefined, config);
                    if (!mainClassOption || !mainClassOption.mainClass) { // Exit silently if the user cancels the prompt fix by ESC.
                        // Exit the debug session.
                        return;
                    }
                    config.mainClass = mainClassOption.mainClass;
                    config.projectName = mainClassOption.projectName;
                    if (_.isEmpty(config.classPaths) && _.isEmpty(config.modulePaths)) {
                        const result = (yield resolveClasspath(config.mainClass, config.projectName));
                        config.modulePaths = result[0];
                        config.classPaths = result[1];
                    }
                    if (_.isEmpty(config.classPaths) && _.isEmpty(config.modulePaths)) {
                        throw new utility.UserError({
                            message: "Cannot resolve the modulepaths/classpaths automatically, please specify the value in the launch.json.",
                            type: logger_1.Type.USAGEERROR,
                        });
                    }
                }
                else if (config.request === "attach") {
                    if (!config.hostName || !config.port) {
                        throw new utility.UserError({
                            message: "Please specify the host name and the port of the remote debuggee in the launch.json.",
                            type: logger_1.Type.USAGEERROR,
                            anchor: anchor.ATTACH_CONFIG_ERROR,
                        });
                    }
                }
                else {
                    throw new utility.UserError({
                        message: `Request type "${config.request}" is not supported. Only "launch" and "attach" are supported.`,
                        type: logger_1.Type.USAGEERROR,
                        anchor: anchor.REQUEST_TYPE_NOT_SUPPORTED,
                    });
                }
                if (Array.isArray(config.args)) {
                    config.args = this.concatArgs(config.args);
                }
                if (Array.isArray(config.vmArgs)) {
                    config.vmArgs = this.concatArgs(config.vmArgs);
                }
                const debugServerPort = yield startDebugSession();
                if (debugServerPort) {
                    config.debugServer = debugServerPort;
                    return config;
                }
                else {
                    // Information for diagnostic:
                    console.log("Cannot find a port for debugging session");
                    throw new Error("Failed to start debug server.");
                }
            }
            catch (ex) {
                if (ex instanceof utility.UserError) {
                    utility.showErrorMessageWithTroubleshooting(ex.context);
                    return undefined;
                }
                const errorMessage = (ex && ex.message) || ex;
                utility.showErrorMessageWithTroubleshooting({
                    message: String(errorMessage),
                    type: logger_1.Type.EXCEPTION,
                    details: utility.formatErrorProperties(ex),
                });
                return undefined;
            }
        });
    }
    /**
     * Converts an array of arguments to a string as the args and vmArgs.
     */
    concatArgs(args) {
        return _.join(_.map(args, (arg) => {
            const str = String(arg);
            // if it has quotes or spaces, use double quotes to wrap it
            if (/['"\s]/.test(str)) {
                return "\"" + str.replace(/(['"\\])/g, "\\$1") + "\"";
            }
            return str;
            // if it has only single quotes
        }), " ");
    }
    /**
     * When VS Code cannot find any available DebugConfiguration, it passes a { noDebug?: boolean } to resolve.
     * This function judges whether a DebugConfiguration is empty by filtering out the field "noDebug".
     */
    isEmptyConfig(config) {
        return Object.keys(config).filter((key) => key !== "noDebug").length === 0;
    }
    resolveLaunchConfig(folder, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!config.mainClass) {
                return yield this.promptMainClass(folder);
            }
            const containsExternalClasspaths = !_.isEmpty(config.classPaths) || !_.isEmpty(config.modulePaths);
            const validationResponse = yield validateLaunchConfig(folder, config.mainClass, config.projectName, containsExternalClasspaths);
            if (!validationResponse.mainClass.isValid || !validationResponse.projectName.isValid) {
                return yield this.fixMainClass(folder, config, validationResponse);
            }
            return {
                mainClass: config.mainClass,
                projectName: config.projectName,
            };
        });
    }
    fixMainClass(folder, config, validationResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            if (!validationResponse.mainClass.isValid) {
                errors.push(String(validationResponse.mainClass.message));
            }
            if (!validationResponse.projectName.isValid) {
                errors.push(String(validationResponse.projectName.message));
            }
            if (validationResponse.proposals && validationResponse.proposals.length) {
                const answer = yield utility.showErrorMessageWithTroubleshooting({
                    message: errors.join(os.EOL),
                    type: logger_1.Type.USAGEERROR,
                    anchor: anchor.FAILED_TO_RESOLVE_CLASSPATH,
                }, "Fix");
                if (answer === "Fix") {
                    const pickItems = this.formatMainClassOptions(validationResponse.proposals);
                    const selectedFix = yield this.showMainClassQuickPick(pickItems, "Please select main class<project name>", false);
                    if (selectedFix) {
                        logger_1.logger.log(logger_1.Type.USAGEDATA, {
                            fix: "yes",
                            fixMessage: errors.join(os.EOL),
                        });
                        yield this.persistMainClassOption(folder, config, selectedFix);
                    }
                    return selectedFix;
                }
                // return undefined if the user clicks "Learn More".
                return;
            }
            throw new utility.UserError({
                message: errors.join(os.EOL),
                type: logger_1.Type.USAGEERROR,
                anchor: anchor.FAILED_TO_RESOLVE_CLASSPATH,
            });
        });
    }
    persistMainClassOption(folder, oldConfig, change) {
        return __awaiter(this, void 0, void 0, function* () {
            const newConfig = _.cloneDeep(oldConfig);
            newConfig.mainClass = change.mainClass;
            newConfig.projectName = change.projectName;
            return this.persistLaunchConfig(folder, oldConfig, newConfig);
        });
    }
    persistLaunchConfig(folder, oldConfig, newConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const launchConfigurations = vscode.workspace.getConfiguration("launch", folder);
            const rawConfigs = launchConfigurations.configurations;
            const targetIndex = _.findIndex(rawConfigs, (config) => _.isEqual(config, oldConfig));
            if (targetIndex >= 0) {
                rawConfigs[targetIndex] = newConfig;
                yield launchConfigurations.update("configurations", rawConfigs);
            }
        });
    }
    promptMainClass(folder) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield resolveMainClass(folder);
            if (res.length === 0) {
                throw new utility.UserError({
                    message: "Cannot find a class with the main method.",
                    type: logger_1.Type.USAGEERROR,
                    anchor: anchor.CANNOT_FIND_MAIN_CLASS,
                });
            }
            const pickItems = this.formatRecentlyUsedMainClassOptions(res);
            const selected = yield this.showMainClassQuickPick(pickItems, "Select main class<project name>");
            if (selected) {
                this.debugHistory.updateMRUTimestamp(selected);
            }
            return selected;
        });
    }
    showMainClassQuickPick(pickItems, quickPickHintMessage, autoPick = true) {
        return __awaiter(this, void 0, void 0, function* () {
            // return undefined when the user cancels QuickPick by pressing ESC.
            const selected = (pickItems.length === 1 && autoPick) ?
                pickItems[0] : yield vscode.window.showQuickPick(pickItems, { placeHolder: quickPickHintMessage });
            return selected && selected.item;
        });
    }
    formatRecentlyUsedMainClassOptions(options) {
        // Sort the Main Class options with the recently used timestamp.
        options.sort((a, b) => {
            return this.debugHistory.getMRUTimestamp(b) - this.debugHistory.getMRUTimestamp(a);
        });
        const mostRecentlyUsedOption = (options.length && this.debugHistory.contains(options[0])) ? options[0] : undefined;
        const isMostRecentlyUsed = (option) => {
            return mostRecentlyUsedOption
                && mostRecentlyUsedOption.mainClass === option.mainClass
                && mostRecentlyUsedOption.projectName === option.projectName;
        };
        const isFromActiveEditor = (option) => {
            const activeEditor = vscode.window.activeTextEditor;
            const currentActiveFile = _.get(activeEditor, "document.uri.fsPath");
            return option.filePath && currentActiveFile && path.relative(option.filePath, currentActiveFile) === "";
        };
        const isPrivileged = (option) => {
            return isMostRecentlyUsed(option) || isFromActiveEditor(option);
        };
        // Show the most recently used Main Class as the first one,
        // then the Main Class from Active Editor as second,
        // finally other Main Class.
        const adjustedOptions = [];
        options.forEach((option) => {
            if (isPrivileged(option)) {
                adjustedOptions.push(option);
            }
        });
        options.forEach((option) => {
            if (!isPrivileged(option)) {
                adjustedOptions.push(option);
            }
        });
        const pickItems = this.formatMainClassOptions(adjustedOptions);
        pickItems.forEach((pickItem) => {
            const adjustedDetail = [];
            if (isMostRecentlyUsed(pickItem.item)) {
                adjustedDetail.push("$(clock) recently used");
            }
            if (isFromActiveEditor(pickItem.item)) {
                adjustedDetail.push(`$(file-text) active editor (${path.basename(pickItem.item.filePath)})`);
            }
            pickItem.detail = adjustedDetail.join(", ");
        });
        return pickItems;
    }
    formatMainClassOptions(options) {
        return options.map((item) => {
            let label = item.mainClass;
            let description = `main class: ${item.mainClass}`;
            if (item.projectName) {
                label += `<${item.projectName}>`;
                description += ` | project name: ${item.projectName}`;
            }
            return {
                label,
                description,
                detail: null,
                item,
            };
        });
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
function validateLaunchConfig(workspaceUri, mainClass, projectName, containsExternalClasspaths) {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_VALIDATE_LAUNCHCONFIG, workspaceUri ? workspaceUri.toString() : undefined, mainClass, projectName, containsExternalClasspaths);
}
function updateDebugSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        const debugSettingsRoot = vscode.workspace.getConfiguration("java.debug");
        if (!debugSettingsRoot) {
            return;
        }
        const logLevel = convertLogLevel(debugSettingsRoot.logLevel || "");
        const javaHome = yield utility.getJavaHome();
        if (debugSettingsRoot.settings && Object.keys(debugSettingsRoot.settings).length) {
            try {
                console.log("settings:", yield commands.executeJavaLanguageServerCommand(commands.JAVA_UPDATE_DEBUG_SETTINGS, JSON.stringify(Object.assign({}, debugSettingsRoot.settings, { logLevel, javaHome }))));
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
class MostRecentlyUsedHistory {
    constructor() {
        this.cache = {};
    }
    getMRUTimestamp(mainClassOption) {
        return this.cache[this.getKey(mainClassOption)] || 0;
    }
    updateMRUTimestamp(mainClassOption) {
        this.cache[this.getKey(mainClassOption)] = Date.now();
    }
    contains(mainClassOption) {
        return Boolean(this.cache[this.getKey(mainClassOption)]);
    }
    getKey(mainClassOption) {
        return mainClassOption.mainClass + "|" + mainClassOption.projectName;
    }
}
//# sourceMappingURL=configurationProvider.js.map