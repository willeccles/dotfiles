// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
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
const vscode_1 = require("vscode");
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const classPathManager_1 = require("./classPathManager");
const junitCodeLensProvider_1 = require("./junitCodeLensProvider");
const projectManager_1 = require("./projectManager");
const testConfigManager_1 = require("./testConfigManager");
const testReportProvider_1 = require("./testReportProvider");
const testResourceManager_1 = require("./testResourceManager");
const testStatusBarProvider_1 = require("./testStatusBarProvider");
const Commands = require("./Constants/commands");
const Configs = require("./Constants/configs");
const Constants = require("./Constants/constants");
const testExplorer_1 = require("./Explorer/testExplorer");
const protocols_1 = require("./Models/protocols");
const testRunnerWrapper_1 = require("./Runner/testRunnerWrapper");
const junit5TestRunner_1 = require("./Runner/JUnitTestRunner/junit5TestRunner");
const junitTestRunner_1 = require("./Runner/JUnitTestRunner/junitTestRunner");
const commandUtility_1 = require("./Utils/commandUtility");
const Logger = require("./Utils/Logger/logger");
const outputTransport_1 = require("./Utils/Logger/outputTransport");
const telemetryTransport_1 = require("./Utils/Logger/telemetryTransport");
const onDidChange = new vscode_1.EventEmitter();
const testStatusBarItem = testStatusBarProvider_1.TestStatusBarProvider.getInstance();
const outputChannel = vscode_1.window.createOutputChannel('Test Output');
const testResourceManager = new testResourceManager_1.TestResourceManager();
const projectManager = new projectManager_1.ProjectManager();
const classPathManager = new classPathManager_1.ClassPathManager(projectManager);
const testConfigManager = new testConfigManager_1.TestConfigManager(projectManager);
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        vscode_extension_telemetry_wrapper_1.TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath('./package.json'));
        context.subscriptions.push(vscode_extension_telemetry_wrapper_1.TelemetryWrapper.getReporter());
        yield vscode_extension_telemetry_wrapper_1.initializeFromJsonFile(context.asAbsolutePath('./package.json'));
        yield vscode_extension_telemetry_wrapper_1.instrumentOperation('activation', doActivate)(context);
    });
}
exports.activate = activate;
function doActivate(_operationId, context) {
    return __awaiter(this, void 0, void 0, function* () {
        Logger.configure(context, [
            new telemetryTransport_1.TelemetryTransport({ level: 'warn', name: 'telemetry' }),
            new outputTransport_1.OutputTransport({ level: 'info', channel: outputChannel, name: 'output' }),
        ]);
        yield testStatusBarItem.init(testResourceManager.refresh());
        const codeLensProvider = new junitCodeLensProvider_1.JUnitCodeLensProvider(onDidChange, testResourceManager);
        context.subscriptions.push(vscode_1.languages.registerCodeLensProvider(Configs.LANGUAGE, codeLensProvider));
        const testReportProvider = new testReportProvider_1.TestReportProvider(context, testResourceManager);
        context.subscriptions.push(vscode_1.workspace.registerTextDocumentContentProvider(testReportProvider_1.TestReportProvider.scheme, testReportProvider));
        const testExplorer = new testExplorer_1.TestExplorer(context, testResourceManager);
        context.subscriptions.push(vscode_1.window.registerTreeDataProvider(Constants.TEST_EXPLORER_VIEW_ID, testExplorer));
        testResourceManager.onDidChangeTestStorage(() => {
            testExplorer.refresh();
        });
        const watcher = vscode_1.workspace.createFileSystemWatcher('**/*.{[jJ][aA][vV][aA]}');
        context.subscriptions.push(watcher);
        watcher.onDidChange((uri) => {
            testResourceManager.setDirty(uri);
            onDidChange.fire();
        });
        watcher.onDidDelete((uri) => {
            testResourceManager.removeTests(uri);
        });
        const reports = new Set();
        vscode_1.workspace.onDidOpenTextDocument((document) => {
            const uri = document.uri;
            if (uri.scheme === testReportProvider_1.TestReportProvider.scheme) {
                reports.add(uri);
            }
        });
        vscode_1.workspace.onDidCloseTextDocument((document) => {
            const uri = document.uri;
            if (uri.scheme === testReportProvider_1.TestReportProvider.scheme) {
                reports.delete(uri);
            }
        });
        codeLensProvider.onDidChangeCodeLenses(() => {
            if (reports.size > 0) {
                reports.forEach((uri) => {
                    testReportProvider.refresh(uri);
                });
            }
        });
        const javaHome = yield getJavaHome();
        if (!javaHome) {
            const errMsg = 'Could not find Java home...';
            Logger.error(errMsg, {}, true);
            throw new Error(errMsg);
        }
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_RUN_TEST_COMMAND, (suites) => runTest(suites, false, true)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_DEBUG_TEST_COMMAND, (suites) => runTest(suites, true, true)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_SHOW_REPORT, (test) => showDetails(test)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_SHOW_OUTPUT, () => outputChannel.show()));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_EXPLORER_SELECT, (node) => testExplorer.select(node)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_EXPLORER_RUN_TEST, (node) => runTestFromExplorer(testExplorer, node, false, true)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_EXPLORER_DEBUG_TEST, (node) => runTestFromExplorer(testExplorer, node, true, true)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_EXPLORER_RUN_TEST_WITH_CONFIG, (node) => runTestFromExplorer(testExplorer, node, false, false)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_EXPLORER_DEBUG_TEST_WITH_CONFIG, (node) => runTestFromExplorer(testExplorer, node, true, false)));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_OPEN_LOG, () => openTestLogFile(context.asAbsolutePath(Configs.LOG_FILE_NAME))));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_CONFIGURE_TEST_COMMAND, () => testConfigManager.editConfig()));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_TEST_CANCEL, () => testRunnerWrapper_1.TestRunnerWrapper.cancel()));
        context.subscriptions.push(instrumentAndRegisterCommand(Commands.JAVA_CLASSPATH_REFRESH, () => classPathManager.refresh()));
        testRunnerWrapper_1.TestRunnerWrapper.registerRunner(protocols_1.TestKind.JUnit, new junitTestRunner_1.JUnitTestRunner(javaHome, context.storagePath, classPathManager, projectManager, onDidChange));
        testRunnerWrapper_1.TestRunnerWrapper.registerRunner(protocols_1.TestKind.JUnit5, new junit5TestRunner_1.JUnit5TestRunner(javaHome, context.storagePath, classPathManager, projectManager, onDidChange));
        yield classPathManager.refresh();
        yield vscode_1.commands.executeCommand('setContext', 'java.test.activated', true);
    });
}
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        testResourceManager.dispose();
        classPathManager.dispose();
        testStatusBarItem.dispose();
        commandUtility_1.CommandUtility.clearCommandsCache();
        yield vscode_extension_telemetry_wrapper_1.dispose();
    });
}
exports.deactivate = deactivate;
function instrumentAndRegisterCommand(name, cb) {
    const instrumented = vscode_extension_telemetry_wrapper_1.instrumentOperation(name, (_operationId, ...args) => __awaiter(this, void 0, void 0, function* () { return cb(...args); }));
    return vscode_extension_telemetry_wrapper_1.TelemetryWrapper.registerCommand(name, instrumented);
}
function getJavaHome() {
    return __awaiter(this, void 0, void 0, function* () {
        const extension = vscode_1.extensions.getExtension('redhat.java');
        try {
            const extensionApi = yield extension.activate();
            if (extensionApi && extensionApi.javaRequirement) {
                return extensionApi.javaRequirement.java_home;
            }
        }
        catch (ex) {
        }
        return '';
    });
}
function runTest(tests, isDebugMode, defaultConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        outputChannel.clear();
        const testList = Array.isArray(tests) ? tests : [tests];
        const config = yield getTestConfig(testList, isDebugMode, defaultConfig);
        return testRunnerWrapper_1.TestRunnerWrapper.run(testList, isDebugMode, config);
    });
}
function runTestFromExplorer(explorer, node, isDebugMode, defaultConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const tests = explorer.resolveTestSuites(node);
        return runTest(tests, isDebugMode, defaultConfig);
    });
}
function getTestConfig(tests, isDebugMode, isDefault) {
    return __awaiter(this, void 0, void 0, function* () {
        let configs;
        try {
            configs = yield testConfigManager.loadConfig(tests);
        }
        catch (ex) {
            vscode_1.window.showErrorMessage(`Failed to load the test config! Please check whether your test configuration is a valid JSON file. Details: ${ex.message}.`);
            throw ex;
        }
        const runConfigs = isDebugMode ? configs.map((c) => c.debug) : configs.map((c) => c.run);
        if (isDefault) {
            // we don't support `Run with default config` if you trigger the test from multi-root folders.
            if (runConfigs.length !== 1 || !runConfigs[0].default) {
                return undefined;
            }
            const runConfig = runConfigs[0];
            const candidates = runConfig.items.filter((i) => i.name === runConfig.default);
            if (candidates.length === 0) {
                vscode_1.window.showWarningMessage(`There is no config with name: ${runConfig.default}.`);
                return undefined;
            }
            if (candidates.length > 1) {
                vscode_1.window.showWarningMessage(`Duplicate configs with default name: ${runConfig.default}.`);
            }
            return candidates[0];
        }
        if (runConfigs.length > 1) {
            vscode_1.window.showWarningMessage('It is not supported to run tests with config from multi root.');
        }
        const items = runConfigs.reduce((a, r) => a.concat(r.items), []).map((c) => {
            return {
                label: c.name,
                description: `project name: ${c.projectName}`,
                item: c,
            };
        });
        const selection = yield vscode_1.window.showQuickPick(items, { placeHolder: 'Select test config' });
        if (!selection) {
            throw new Error('Please specify the test config to use!');
        }
        return selection.item;
    });
}
function showDetails(test) {
    const testList = Array.isArray(test) ? test : [test];
    const uri = testReportProvider_1.encodeTestSuite(testList);
    const name = testReportProvider_1.parseTestReportName(testList);
    const config = vscode_1.workspace.getConfiguration();
    const position = config.get('java.test.report.position', 'sideView');
    return vscode_1.commands.executeCommand('vscode.previewHtml', uri, position === 'sideView' ? vscode_1.ViewColumn.Two : vscode_1.ViewColumn.Active, name);
}
function openTestLogFile(logFile) {
    return vscode_1.workspace.openTextDocument(logFile).then((doc) => {
        return vscode_1.window.showTextDocument(doc);
    }, () => false).then((didOpen) => {
        if (!didOpen) {
            vscode_1.window.showWarningMessage('Could not open Test Log file');
        }
        return didOpen ? true : false;
    });
}
//# sourceMappingURL=extension.js.map