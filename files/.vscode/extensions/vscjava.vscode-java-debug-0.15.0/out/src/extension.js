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
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const commands = require("./commands");
const configurationProvider_1 = require("./configurationProvider");
const constants_1 = require("./constants");
const debugCodeLensProvider_1 = require("./debugCodeLensProvider");
const hotCodeReplace_1 = require("./hotCodeReplace");
const logger_1 = require("./logger");
const utility = require("./utility");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        yield vscode_extension_telemetry_wrapper_1.initializeFromJsonFile(context.asAbsolutePath("./package.json"));
        yield vscode_extension_telemetry_wrapper_1.instrumentOperation("activation", initializeExtension)(context);
    });
}
exports.activate = activate;
function initializeExtension(operationId, context) {
    logger_1.logger.initialize(context);
    logger_1.logger.log(logger_1.Type.ACTIVATEEXTENSION, {}); // TODO: Activation belongs to usage data, remove this line.
    logger_1.logger.log(logger_1.Type.USAGEDATA, {
        description: "activateExtension",
    });
    const measureKeys = ["duration"];
    vscode.debug.onDidTerminateDebugSession(() => {
        fetchUsageData().then((ret) => {
            if (Array.isArray(ret) && ret.length) {
                ret.forEach((entry) => {
                    const commonProperties = {};
                    const measureProperties = {};
                    for (const key of Object.keys(entry)) {
                        if (measureKeys.indexOf(key) >= 0) {
                            measureProperties[key] = entry[key];
                        }
                        else {
                            commonProperties[key] = String(entry[key]);
                        }
                    }
                    logger_1.logger.log(entry.scope === "exception" ? logger_1.Type.EXCEPTION : logger_1.Type.USAGEDATA, commonProperties, measureProperties);
                });
            }
        });
    });
    context.subscriptions.push(logger_1.logger);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("java", new configurationProvider_1.JavaDebugConfigurationProvider()));
    context.subscriptions.push(instrumentAndRegisterCommand("JavaDebug.SpecifyProgramArgs", () => __awaiter(this, void 0, void 0, function* () {
        return specifyProgramArguments(context);
    })));
    hotCodeReplace_1.initializeHotCodeReplace(context);
    context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((customEvent) => {
        const t = customEvent.session ? customEvent.session.type : undefined;
        if (t !== constants_1.JAVA_LANGID) {
            return;
        }
        if (customEvent.event === constants_1.HCR_EVENT) {
            hotCodeReplace_1.handleHotCodeReplaceCustomEvent(customEvent);
        }
        else if (customEvent.event === constants_1.USER_NOTIFICATION_EVENT) {
            handleUserNotification(customEvent);
        }
    }));
    debugCodeLensProvider_1.initializeCodeLensProvider(context);
}
// this method is called when your extension is deactivated
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        yield vscode_extension_telemetry_wrapper_1.dispose();
    });
}
exports.deactivate = deactivate;
function handleUserNotification(customEvent) {
    if (customEvent.body.notificationType === "ERROR") {
        utility.showErrorMessageWithTroubleshooting({
            message: customEvent.body.message,
        });
    }
    else if (customEvent.body.notificationType === "WARNING") {
        utility.showWarningMessageWithTroubleshooting({
            message: customEvent.body.message,
        });
    }
    else {
        vscode.window.showInformationMessage(customEvent.body.message);
    }
}
function fetchUsageData() {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_FETCH_USAGE_DATA);
}
function specifyProgramArguments(context) {
    const javaDebugProgramArgsKey = "JavaDebugProgramArgs";
    const options = {
        ignoreFocusOut: true,
        placeHolder: "Enter program arguments or leave empty to pass no args",
    };
    const prevArgs = context.workspaceState.get(javaDebugProgramArgsKey, "");
    if (prevArgs.length > 0) {
        options.value = prevArgs;
    }
    return vscode.window.showInputBox(options).then((text) => {
        // When user cancels the input box (by pressing Esc), the text value is undefined.
        if (text !== undefined) {
            context.workspaceState.update(javaDebugProgramArgsKey, text);
        }
        return text || " ";
    });
}
function instrumentAndRegisterCommand(name, cb) {
    const instrumented = vscode_extension_telemetry_wrapper_1.instrumentOperation(name, (_operationId, myargs) => __awaiter(this, void 0, void 0, function* () { return yield cb(myargs); }));
    return vscode.commands.registerCommand(name, instrumented);
}
//# sourceMappingURL=extension.js.map