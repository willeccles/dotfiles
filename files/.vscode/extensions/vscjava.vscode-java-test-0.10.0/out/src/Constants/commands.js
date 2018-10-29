"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
/**
 * Run test
 */
exports.JAVA_RUN_TEST_COMMAND = 'java.test.run';
/**
 * Debug test
 */
exports.JAVA_DEBUG_TEST_COMMAND = 'java.test.debug';
exports.JAVA_TEST_SHOW_REPORT = 'java.test.show.report';
exports.JAVA_TEST_EXPLORER_SELECT = 'java.test.explorer.select';
exports.JAVA_TEST_EXPLORER_RUN_TEST = 'java.test.explorer.run';
exports.JAVA_TEST_EXPLORER_DEBUG_TEST = 'java.test.explorer.debug';
exports.JAVA_TEST_EXPLORER_RUN_TEST_WITH_CONFIG = 'java.test.explorer.run.config';
exports.JAVA_TEST_EXPLORER_DEBUG_TEST_WITH_CONFIG = 'java.test.explorer.debug.config';
exports.JAVA_TEST_SHOW_OUTPUT = 'java.test.show.output';
exports.JAVA_TEST_OPEN_LOG = 'java.test.open.log';
exports.JAVA_TEST_CANCEL = 'java.test.cancel';
exports.JAVA_CONFIGURE_TEST_COMMAND = 'java.test.configure';
exports.JAVA_CLASSPATH_REFRESH = 'java.classpath.refresh';
exports.JAVA_FETCH_TEST = 'vscode.java.test.fetch';
exports.JAVA_SEARCH_ALL_TESTS = 'vscode.java.test.search.all';
exports.JAVA_CALCULATE_CLASS_PATH = 'vscode.java.test.runtime.classpath';
exports.JAVA_GET_PROJECT_INFO = 'vscode.java.test.project.info';
exports.JAVA_EXECUTE_WORKSPACE_COMMAND = 'java.execute.workspaceCommand';
function executeJavaLanguageServerCommand(...rest) {
    // TODO: need to handle error and trace telemetry
    return vscode.commands.executeCommand(exports.JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
}
exports.executeJavaLanguageServerCommand = executeJavaLanguageServerCommand;
//# sourceMappingURL=commands.js.map