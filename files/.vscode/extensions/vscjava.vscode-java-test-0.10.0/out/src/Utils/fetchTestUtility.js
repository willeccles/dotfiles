"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const Commands = require("../Constants/commands");
function fetchTests(document) {
    return Commands.executeJavaLanguageServerCommand(Commands.JAVA_FETCH_TEST, document.uri.toString()).then((tests) => {
        transformIndex(tests);
        return tests;
    }, (reason) => {
        return Promise.reject(reason);
    });
}
exports.fetchTests = fetchTests;
function searchAllTests() {
    return Commands.executeJavaLanguageServerCommand(Commands.JAVA_SEARCH_ALL_TESTS).then((tests) => {
        transformIndex(tests);
        return tests;
    }, (reason) => {
        return Promise.reject(reason);
    });
}
exports.searchAllTests = searchAllTests;
function transformIndex(tests) {
    tests.map((t) => {
        if (t.parentIndex !== undefined) {
            t.parent = tests[t.parentIndex];
        }
        if (t.childrenIndices) {
            t.children = t.childrenIndices.map((i) => tests[i]);
        }
    });
}
//# sourceMappingURL=fetchTestUtility.js.map