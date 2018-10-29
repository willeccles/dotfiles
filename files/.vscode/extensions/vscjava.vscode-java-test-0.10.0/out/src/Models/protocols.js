"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
var TestStatus;
(function (TestStatus) {
    TestStatus["Pass"] = "Pass";
    TestStatus["Fail"] = "Fail";
    TestStatus["Skipped"] = "Skipped";
})(TestStatus = exports.TestStatus || (exports.TestStatus = {}));
var TestLevel;
(function (TestLevel) {
    TestLevel[TestLevel["Method"] = 0] = "Method";
    TestLevel[TestLevel["Class"] = 1] = "Class";
})(TestLevel = exports.TestLevel || (exports.TestLevel = {}));
var TestKind;
(function (TestKind) {
    TestKind[TestKind["JUnit"] = 0] = "JUnit";
    TestKind[TestKind["JUnit5"] = 1] = "JUnit5";
})(TestKind = exports.TestKind || (exports.TestKind = {}));
//# sourceMappingURL=protocols.js.map