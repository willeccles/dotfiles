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
const _ = require("lodash");
const vscode = require("vscode");
const commands = require("./commands");
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const utility = require("./utility");
const JAVA_RUN_COMMAND = "vscode.java.run";
const JAVA_DEBUG_COMMAND = "vscode.java.debug";
const JAVA_DEBUG_CONFIGURATION = "java.debug.settings";
const ENABLE_CODE_LENS_VARIABLE = "enableRunDebugCodeLens";
function initializeCodeLensProvider(context) {
    context.subscriptions.push(new DebugCodeLensContainer());
}
exports.initializeCodeLensProvider = initializeCodeLensProvider;
class DebugCodeLensContainer {
    constructor() {
        this.runCommand = vscode.commands.registerCommand(JAVA_RUN_COMMAND, runJavaProgram);
        this.debugCommand = vscode.commands.registerCommand(JAVA_DEBUG_COMMAND, debugJavaProgram);
        const configuration = vscode.workspace.getConfiguration(JAVA_DEBUG_CONFIGURATION);
        const isCodeLensEnabled = configuration.get(ENABLE_CODE_LENS_VARIABLE);
        if (isCodeLensEnabled) {
            this.lensProvider = vscode.languages.registerCodeLensProvider(constants_1.JAVA_LANGID, new DebugCodeLensProvider());
        }
        this.configurationEvent = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(JAVA_DEBUG_CONFIGURATION)) {
                const newConfiguration = vscode.workspace.getConfiguration(JAVA_DEBUG_CONFIGURATION);
                const newEnabled = newConfiguration.get(ENABLE_CODE_LENS_VARIABLE);
                if (newEnabled && this.lensProvider === undefined) {
                    this.lensProvider = vscode.languages.registerCodeLensProvider(constants_1.JAVA_LANGID, new DebugCodeLensProvider());
                }
                else if (!newEnabled && this.lensProvider !== undefined) {
                    this.lensProvider.dispose();
                    this.lensProvider = undefined;
                }
            }
        }, this);
    }
    dispose() {
        if (this.lensProvider !== undefined) {
            this.lensProvider.dispose();
        }
        this.runCommand.dispose();
        this.debugCommand.dispose();
        this.configurationEvent.dispose();
    }
}
class DebugCodeLensProvider {
    provideCodeLenses(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const mainMethods = yield resolveMainMethod(document);
            return _.flatten(mainMethods.map((method) => {
                return [
                    new vscode.CodeLens(method.range, {
                        title: "▶ Run",
                        command: JAVA_RUN_COMMAND,
                        tooltip: "Run Java Program",
                        arguments: [method.mainClass, method.projectName, document.uri],
                    }),
                    new vscode.CodeLens(method.range, {
                        title: "🐞 Debug",
                        command: JAVA_DEBUG_COMMAND,
                        tooltip: "Debug Java Program",
                        arguments: [method.mainClass, method.projectName, document.uri],
                    }),
                ];
            }));
        });
    }
}
function runJavaProgram(mainClass, projectName, uri) {
    return runCodeLens(mainClass, projectName, uri, true);
}
function debugJavaProgram(mainClass, projectName, uri) {
    return runCodeLens(mainClass, projectName, uri, false);
}
function runCodeLens(mainClass, projectName, uri, noDebug) {
    return __awaiter(this, void 0, void 0, function* () {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const workspaceUri = workspaceFolder ? workspaceFolder.uri : undefined;
        const debugConfig = yield constructDebugConfig(mainClass, projectName, workspaceUri);
        debugConfig.projectName = projectName;
        debugConfig.noDebug = noDebug;
        vscode.debug.startDebugging(workspaceFolder, debugConfig);
        logger_1.logger.log(logger_1.Type.USAGEDATA, {
            runCodeLens: "yes",
            noDebug: String(noDebug),
        });
    });
}
function constructDebugConfig(mainClass, projectName, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        const launchConfigurations = vscode.workspace.getConfiguration("launch", workspace);
        const rawConfigs = launchConfigurations.configurations;
        let debugConfig = _.find(rawConfigs, (config) => {
            return config.mainClass === mainClass && _.toString(config.projectName) === _.toString(projectName);
        });
        if (!debugConfig) {
            debugConfig = _.find(rawConfigs, (config) => {
                return config.mainClass === mainClass && !config.projectName;
            });
        }
        if (!debugConfig) {
            debugConfig = {
                type: "java",
                name: `CodeLens (Launch) - ${mainClass.substr(mainClass.lastIndexOf(".") + 1)}`,
                request: "launch",
                // tslint:disable-next-line
                cwd: workspace ? "${workspaceFolder}" : undefined,
                console: "internalConsole",
                stopOnEntry: false,
                mainClass,
                args: "",
                projectName,
            };
            // Persist the default debug configuration only if the workspace exists.
            if (workspace) {
                // Insert the default debug configuration to the beginning of launch.json.
                rawConfigs.splice(0, 0, debugConfig);
                yield launchConfigurations.update("configurations", rawConfigs, vscode.ConfigurationTarget.WorkspaceFolder);
            }
        }
        return _.cloneDeep(debugConfig);
    });
}
function resolveMainMethod(document) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield commands.executeJavaLanguageServerCommand(commands.JAVA_RESOLVE_MAINMETHOD, document.uri.toString());
        }
        catch (ex) {
            logger_1.logger.log(logger_1.Type.EXCEPTION, utility.formatErrorProperties(ex));
            return [];
        }
    });
}
//# sourceMappingURL=debugCodeLensProvider.js.map