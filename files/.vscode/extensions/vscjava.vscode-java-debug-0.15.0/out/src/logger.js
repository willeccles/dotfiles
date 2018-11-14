"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
var Type;
(function (Type) {
    Type["EXCEPTION"] = "exception";
    Type["USAGEDATA"] = "usageData";
    Type["USAGEERROR"] = "usageError";
    Type["ACTIVATEEXTENSION"] = "activateExtension";
})(Type = exports.Type || (exports.Type = {}));
class Logger {
    constructor() {
        this.reporter = null;
    }
    initialize(context) {
        if (this.reporter) {
            return;
        }
        const extensionPackage = require(context.asAbsolutePath("./package.json"));
        if (extensionPackage) {
            const packageInfo = {
                name: extensionPackage.name,
                version: extensionPackage.version,
                aiKey: extensionPackage.aiKey,
            };
            if (packageInfo.aiKey) {
                this.reporter = new vscode_extension_telemetry_1.default(packageInfo.name, packageInfo.version, packageInfo.aiKey);
            }
        }
    }
    log(type, properties, measures) {
        if (!this.reporter) {
            return;
        }
        this.reporter.sendTelemetryEvent(type, properties, measures);
    }
    logMessage(type, message) {
        this.log(type, { message });
    }
    dispose() {
        if (this.reporter) {
            this.reporter.dispose();
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map