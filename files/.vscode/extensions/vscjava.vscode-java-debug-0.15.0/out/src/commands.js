"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
exports.VSCODE_STARTDEBUG = "vscode.startDebug";
exports.VSCODE_ADD_DEBUGCONFIGURATION = "debug.addConfiguration";
exports.JAVA_START_DEBUGSESSION = "vscode.java.startDebugSession";
exports.JAVA_RESOLVE_CLASSPATH = "vscode.java.resolveClasspath";
exports.JAVA_RESOLVE_MAINCLASS = "vscode.java.resolveMainClass";
exports.JAVA_VALIDATE_LAUNCHCONFIG = "vscode.java.validateLaunchConfig";
exports.JAVA_BUILD_WORKSPACE = "java.workspace.compile";
exports.JAVA_EXECUTE_WORKSPACE_COMMAND = "java.execute.workspaceCommand";
exports.JAVA_FETCH_USAGE_DATA = "vscode.java.fetchUsageData";
exports.JAVA_UPDATE_DEBUG_SETTINGS = "vscode.java.updateDebugSettings";
exports.JAVA_RESOLVE_MAINMETHOD = "vscode.java.resolveMainMethod";
function executeJavaLanguageServerCommand(...rest) {
    // TODO: need to handle error and trace telemetry
    return vscode.commands.executeCommand(exports.JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
}
exports.executeJavaLanguageServerCommand = executeJavaLanguageServerCommand;
//# sourceMappingURL=commands.js.map