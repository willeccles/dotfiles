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
const opn = require("opn");
const vscode = require("vscode");
const logger_1 = require("./logger");
const TROUBLESHOOTING_LINK = "https://github.com/Microsoft/vscode-java-debug/blob/master/Troubleshooting.md";
const LEARN_MORE = "Learn More";
class UserError extends Error {
    constructor(context) {
        super(context.message);
        this.context = context;
    }
}
exports.UserError = UserError;
function logMessage(message) {
    if (!message.type) {
        return;
    }
    if (message.details) {
        logger_1.logger.log(message.type, message.details);
    }
    else {
        logger_1.logger.logMessage(message.type, message.message);
    }
}
function showInformationMessage(message, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
        logMessage(message);
        return yield vscode.window.showInformationMessage(message.message, ...items);
    });
}
exports.showInformationMessage = showInformationMessage;
function showWarningMessage(message, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
        logMessage(message);
        return yield vscode.window.showWarningMessage(message.message, ...items);
    });
}
exports.showWarningMessage = showWarningMessage;
function showErrorMessage(message, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
        logMessage(message);
        return yield vscode.window.showErrorMessage(message.message, ...items);
    });
}
exports.showErrorMessage = showErrorMessage;
function showInformationMessageWithTroubleshooting(message, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
        const choice = yield showInformationMessage(message, ...items, LEARN_MORE);
        return handleTroubleshooting(choice, message.message, message.anchor);
    });
}
exports.showInformationMessageWithTroubleshooting = showInformationMessageWithTroubleshooting;
function showWarningMessageWithTroubleshooting(message, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
        const choice = yield showWarningMessage(message, ...items, LEARN_MORE);
        return handleTroubleshooting(choice, message.message, message.anchor);
    });
}
exports.showWarningMessageWithTroubleshooting = showWarningMessageWithTroubleshooting;
function showErrorMessageWithTroubleshooting(message, ...items) {
    return __awaiter(this, void 0, void 0, function* () {
        const choice = yield showErrorMessage(message, ...items, LEARN_MORE);
        return handleTroubleshooting(choice, message.message, message.anchor);
    });
}
exports.showErrorMessageWithTroubleshooting = showErrorMessageWithTroubleshooting;
function openLink(url) {
    opn(url);
}
function handleTroubleshooting(choice, message, anchor) {
    if (choice === LEARN_MORE) {
        openLink(anchor ? `${TROUBLESHOOTING_LINK}#${anchor}` : TROUBLESHOOTING_LINK);
        logger_1.logger.log(logger_1.Type.USAGEDATA, {
            troubleshooting: "yes",
            troubleshootingMessage: message,
        });
        return;
    }
    return choice;
}
function formatErrorProperties(ex) {
    const exception = (ex && ex.data && ex.data.cause)
        || { stackTrace: (ex && ex.stack), detailMessage: String((ex && ex.message) || ex || "Unknown exception") };
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
    return properties;
}
exports.formatErrorProperties = formatErrorProperties;
function getJavaHome() {
    return __awaiter(this, void 0, void 0, function* () {
        const extension = vscode.extensions.getExtension("redhat.java");
        try {
            const extensionApi = yield extension.activate();
            if (extensionApi && extensionApi.javaRequirement) {
                return extensionApi.javaRequirement.java_home;
            }
        }
        catch (ex) {
        }
        return "";
    });
}
exports.getJavaHome = getJavaHome;
//# sourceMappingURL=utility.js.map