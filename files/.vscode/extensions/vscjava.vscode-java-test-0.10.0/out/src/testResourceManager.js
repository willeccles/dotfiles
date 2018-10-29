"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const FetchTestsUtility = require("./Utils/fetchTestUtility");
const Logger = require("./Utils/Logger/logger");
class TestResourceManager {
    constructor() {
        this.testsIndexedByFileUri = new Map();
        this._onDidChangeTestStorage = new vscode_1.EventEmitter();
        // tslint:disable-next-line
        this.onDidChangeTestStorage = this._onDidChangeTestStorage.event;
    }
    getTests(file) {
        const path = file.fsPath || '';
        return this.testsIndexedByFileUri.has(path) ? this.testsIndexedByFileUri.get(path) : undefined;
    }
    storeTests(file, tests) {
        if (tests === undefined || tests === null) {
            return;
        }
        const path = file.fsPath || '';
        const test = {
            dirty: false,
            tests,
        };
        this.testsIndexedByFileUri.set(path, test);
        this._onDidChangeTestStorage.fire();
    }
    removeTests(file) {
        const path = file.fsPath || '';
        const deleted = this.testsIndexedByFileUri.delete(path);
        if (deleted) {
            this._onDidChangeTestStorage.fire();
        }
    }
    setDirty(file) {
        const test = this.getTests(file);
        if (test) {
            test.dirty = true;
        }
    }
    isDirty(file) {
        const test = this.getTests(file);
        return test ? test.dirty : undefined;
    }
    getAll() {
        let allTests = [];
        this.testsIndexedByFileUri.forEach((value) => {
            allTests = allTests.concat(value.tests);
        });
        return allTests;
    }
    refresh() {
        return FetchTestsUtility.searchAllTests().then((tests) => {
            this.testsIndexedByFileUri.clear();
            const map = new Map();
            tests.forEach((test) => {
                const key = test.uri;
                const collection = map.get(key);
                if (!collection) {
                    map.set(key, [test]);
                }
                else {
                    collection.push(test);
                }
            });
            map.forEach((value, key) => {
                this.storeTests(vscode_1.Uri.parse(key), value);
            });
        }, (reason) => {
            Logger.error(`Failed to refresh test storage. Details: ${reason}.`);
            return Promise.reject(reason);
        });
    }
    dispose() {
        this.testsIndexedByFileUri.clear();
    }
}
exports.TestResourceManager = TestResourceManager;
//# sourceMappingURL=testResourceManager.js.map