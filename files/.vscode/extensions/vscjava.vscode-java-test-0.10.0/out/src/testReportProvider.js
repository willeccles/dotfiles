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
const path = require("path");
const pug = require("pug");
const vscode_1 = require("vscode");
const protocols_1 = require("./Models/protocols");
class TestReportProvider {
    constructor(_context, _testResourceProvider) {
        this._context = _context;
        this._testResourceProvider = _testResourceProvider;
        this._onDidChangeReport = new vscode_1.EventEmitter();
        TestReportProvider.compiledReportTemplate =
            pug.compileFile(this._context.asAbsolutePath(path.join('resources', 'templates', 'report.pug')));
        TestReportProvider.compiledErrorTemplate =
            pug.compileFile(this._context.asAbsolutePath(path.join('resources', 'templates', 'report_error.pug')));
    }
    get onDidChange() {
        return this._onDidChangeReport.event;
    }
    refresh(uri) {
        this._onDidChangeReport.fire(uri);
    }
    provideTextDocumentContent(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            const [target, test, reportType] = decodeTestSuite(uri);
            const testsContainedInFile = target.map((t) => this._testResourceProvider.getTests(t));
            let isLegacy = false;
            if (testsContainedInFile.findIndex((t) => !t) !== -1) {
                return this.errorSnippet(`No tests in the uri: ${uri}. Shouldn\'t happen, please report us a bug.`);
            }
            if (testsContainedInFile.findIndex((t) => t.dirty) !== -1) {
                isLegacy = true;
            }
            const testMap = new Map(testsContainedInFile.map((t) => t.tests).reduce((a, b) => a.concat(b)).map((t) => [t.test, t]));
            const matchedTest = test.map((t) => testMap.get(t));
            if (matchedTest.findIndex((t) => !t) !== -1) {
                return this.errorSnippet('No matched test found in the test storage. Shouldn\'t happen, please report us a bug.');
            }
            return this.reportSnippet(matchedTest, reportType, isLegacy);
        });
    }
    reportSnippet(test, type, isLegacy) {
        const flattenedTests = this.flattenTests(test);
        const passedTests = flattenedTests.filter((c) => c.result && c.result.status === protocols_1.TestStatus.Pass);
        const failedTests = flattenedTests.filter((c) => c.result && c.result.status === protocols_1.TestStatus.Fail);
        const skippedTests = flattenedTests.filter((c) => c.result && c.result.status === protocols_1.TestStatus.Skipped);
        const extraInfo = {
            tests: type === TestReportType.All ? flattenedTests : (type === TestReportType.Failed ? failedTests : passedTests),
            uri: 'command:vscode.previewHtml?' + encodeURIComponent(JSON.stringify(encodeTestSuite(test, TestReportType.All))),
            passedUri: 'command:vscode.previewHtml?' + encodeURIComponent(JSON.stringify(encodeTestSuite(test, TestReportType.Passed))),
            failedUri: 'command:vscode.previewHtml?' + encodeURIComponent(JSON.stringify(encodeTestSuite(test, TestReportType.Failed))),
            type,
            name: test.length === 1 ? test[0].test.replace('#', '.') : undefined,
            showFilters: flattenedTests.length > 1 || test[0].level === protocols_1.TestLevel.Class,
            isLegacy,
            cssFile: this.cssTheme(),
            totalCount: flattenedTests.length,
            passCount: passedTests.length,
            failedCount: failedTests.length,
            skippedCount: skippedTests.length,
        };
        return this.renderSnippet(extraInfo, TestReportProvider.compiledReportTemplate);
    }
    flattenTests(test) {
        return test.map((t) => t.level === protocols_1.TestLevel.Class ? this.flattenTests(t.children) : [t]).reduce((a, b) => a.concat(b));
    }
    errorSnippet(error) {
        const info = {
            cssFile: this.cssTheme(),
            message: error,
        };
        return this.renderSnippet(info, TestReportProvider.compiledErrorTemplate);
    }
    renderSnippet(content, template) {
        return __awaiter(this, void 0, void 0, function* () {
            return template(content);
        });
    }
    cssTheme() {
        const config = vscode_1.workspace.getConfiguration();
        const theme = config.get('workbench.colorTheme', null);
        const reportTheme = theme && theme.toLowerCase().indexOf('light') !== -1 ? 'light.css' : 'dark.css';
        return this._context.asAbsolutePath(path.join('resources', 'templates', 'css', reportTheme));
    }
}
TestReportProvider.scheme = 'test-report';
exports.TestReportProvider = TestReportProvider;
function encodeTestSuite(test, type = TestReportType.All) {
    const query = JSON.stringify([test.map((t) => t.uri), test.map((t) => t.test), type]);
    return vscode_1.Uri.parse(`${TestReportProvider.scheme}:${parseTestReportName(test, type)}.java?${encodeURIComponent(query)}`);
}
exports.encodeTestSuite = encodeTestSuite;
function decodeTestSuite(uri) {
    const [target, test, type] = JSON.parse(decodeURIComponent(uri.query));
    return [target.map((t) => vscode_1.Uri.parse(t)), test, type];
}
exports.decodeTestSuite = decodeTestSuite;
function parseTestReportName(test, type = TestReportType.All) {
    if (test.length > 1) {
        return 'Aggregated test report';
    }
    const name = test[0].test.split(/\.|#/).slice(-1)[0];
    if (test[0].level === protocols_1.TestLevel.Method) {
        return name;
    }
    return `${name} - ${TestReportType[type]}`;
}
exports.parseTestReportName = parseTestReportName;
var TestReportType;
(function (TestReportType) {
    TestReportType[TestReportType["All"] = 0] = "All";
    TestReportType[TestReportType["Passed"] = 1] = "Passed";
    TestReportType[TestReportType["Failed"] = 2] = "Failed";
})(TestReportType = exports.TestReportType || (exports.TestReportType = {}));
//# sourceMappingURL=testReportProvider.js.map