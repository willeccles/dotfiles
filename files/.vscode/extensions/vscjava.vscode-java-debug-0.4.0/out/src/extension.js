"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
const commands = require("./commands");
const configurationProvider_1 = require("./configurationProvider");
function activate(context) {
    // The reporter will be initialized by the later telemetry handler.
    let reporter = null;
    // Telemetry.
    const extensionPackage = require(context.asAbsolutePath("./package.json"));
    if (extensionPackage) {
        const packageInfo = {
            name: extensionPackage.name,
            version: extensionPackage.version,
            aiKey: extensionPackage.aiKey,
        };
        if (packageInfo.aiKey) {
            reporter = new vscode_extension_telemetry_1.default(packageInfo.name, packageInfo.version, packageInfo.aiKey);
            reporter.sendTelemetryEvent("activateExtension", {});
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
                            reporter.sendTelemetryEvent(entry.scope === "exception" ? "exception" : "usageData", commonProperties, measureProperties);
                        });
                    }
                });
            });
        }
    }
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("java", new configurationProvider_1.JavaDebugConfigurationProvider(reporter)));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
function fetchUsageData() {
    return commands.executeJavaLanguageServerCommand(commands.JAVA_FETCH_USAGE_DATA);
}
//# sourceMappingURL=extension.js.map