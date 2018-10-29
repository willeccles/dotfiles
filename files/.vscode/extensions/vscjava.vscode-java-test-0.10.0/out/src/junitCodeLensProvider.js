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
const Commands = require("./Constants/commands");
const protocols_1 = require("./Models/protocols");
const FetchTestsUtility = require("./Utils/fetchTestUtility");
const Logger = require("./Utils/Logger/logger");
class JUnitCodeLensProvider {
    constructor(_onDidChange, _testCollectionStorage) {
        this._onDidChange = _onDidChange;
        this._testCollectionStorage = _testCollectionStorage;
    }
    get onDidChangeCodeLenses() {
        return this._onDidChange.event;
    }
    provideCodeLenses(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            return FetchTestsUtility.fetchTests(document).then((tests) => {
                const testsFromCache = this._testCollectionStorage.getTests(document.uri);
                if (testsFromCache) {
                    this.mergeTestResult(testsFromCache.tests, tests);
                }
                this._testCollectionStorage.storeTests(document.uri, tests);
                return getCodeLens(tests);
            }, (reason) => {
                if (token.isCancellationRequested) {
                    Logger.error('test codelens request is cancelled.', undefined, true);
                    return [];
                }
                Logger.error(`Failed to get test codelens. Details: ${reason}.`);
                return Promise.reject(reason);
            });
        });
    }
    mergeTestResult(cache, cur) {
        const dict = new Map(cache.map((t) => [t.test, t.result]));
        cur.map((testSuite) => {
            if (!testSuite.result && dict.has(testSuite.test)) {
                testSuite.result = dict.get(testSuite.test);
            }
        });
    }
}
exports.JUnitCodeLensProvider = JUnitCodeLensProvider;
function getTestStatusIcon(status) {
    const isMac = /^darwin/.test(process.platform);
    switch (status) {
        case protocols_1.TestStatus.Pass: {
            return isMac ? '✅' : '✔️';
        }
        case protocols_1.TestStatus.Fail: {
            return '❌';
        }
        case protocols_1.TestStatus.Skipped: {
            return '❔';
        }
        default: {
            return '❓';
        }
    }
}
function getCodeLens(tests) {
    return tests.map((test) => {
        const codeLenses = [
            new vscode_1.CodeLens(test.range, {
                title: 'Run Test',
                command: Commands.JAVA_RUN_TEST_COMMAND,
                tooltip: 'Run Test',
                arguments: [test],
            }),
            new vscode_1.CodeLens(test.range, {
                title: 'Debug Test',
                command: Commands.JAVA_DEBUG_TEST_COMMAND,
                tooltip: 'Debug Test',
                arguments: [test],
            }),
        ];
        if (test.result) {
            codeLenses.push(new vscode_1.CodeLens(test.range, {
                title: getTestStatusIcon(test.result.status),
                command: Commands.JAVA_TEST_SHOW_REPORT,
                tooltip: 'Show Report',
                arguments: [test],
            }));
        }
        return codeLenses;
    }).reduce((a, b) => a.concat(b), []);
}
//# sourceMappingURL=junitCodeLensProvider.js.map