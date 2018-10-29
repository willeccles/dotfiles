"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const protocols_1 = require("../../Models/protocols");
const Logger = require("../../Utils/Logger/logger");
const jarFileRunnerResultAnalyzer_1 = require("../JarFileRunner/jarFileRunnerResultAnalyzer");
const TEST_START = 'testStarted';
const TEST_SKIP = 'testSkipped';
const TEST_FINISH = 'testFinished';
class JUnit5RunnerResultAnalyzer extends jarFileRunnerResultAnalyzer_1.JarFileRunnerResultAnalyzer {
    analyzeData(data) {
        let match;
        do {
            match = JUnit5RunnerResultAnalyzer.regex.exec(data);
            if (match) {
                try {
                    this.analyzeDataCore(match[1]);
                }
                catch (ex) {
                    Logger.error(`Failed to analyze runner output data. Data: ${match[1]}.`, {
                        error: ex,
                    });
                }
            }
        } while (match);
    }
    analyzeError(error) {
        Logger.error(`Error occurred: ${error}`);
    }
    feedBack(isCancelled) {
        const result = [];
        this._tests.forEach((t) => {
            if (t.level === protocols_1.TestLevel.Class) {
                t.children.forEach((c) => this.processMethod(c, result, isCancelled));
            }
            else {
                this.processMethod(t, result, isCancelled);
            }
        });
        return result;
    }
    analyzeDataCore(match) {
        let res;
        const info = JSON.parse(match);
        if (info.attributes.type !== JUnit5TestType.TEST) {
            return;
        }
        switch (info.name) {
            case TEST_START:
                this._testResults.set(this.parseFullyQualifiedNameFromId(info.attributes.id), {
                    status: undefined,
                });
                break;
            case TEST_SKIP:
                res = this._testResults.set(this.parseFullyQualifiedNameFromId(info.attributes.id), {
                    status: protocols_1.TestStatus.Skipped,
                    details: this.decodeContent(info.attributes.details),
                });
                break;
            case TEST_FINISH:
                res = this._testResults.get(this.parseFullyQualifiedNameFromId(info.attributes.id));
                if (!res) {
                    return;
                }
                res.status = this.parseTestStatus(info.attributes.status);
                res.details = this.decodeContent(info.attributes.details);
                res.duration = info.attributes.duration;
                break;
        }
    }
    processMethod(t, result, isCancelled) {
        if (!this._testResults.has(t.test)) {
            if (isCancelled) {
                return;
            }
            this._testResults.set(t.test, {
                status: protocols_1.TestStatus.Skipped,
            });
        }
        result.push({
            test: t.test,
            uri: t.uri,
            result: this._testResults.get(t.test),
        });
    }
    decodeContent(content) {
        if (!content) {
            return content;
        }
        return content.replace(new RegExp('&#x40;', 'gm'), '@');
    }
    parseFullyQualifiedNameFromId(id) {
        if (!id) {
            return id;
        }
        const regex = /\[(engine|class|method):([^\]]*)\]/gm;
        let fullname = '';
        let match;
        do {
            match = regex.exec(id);
            if (match && match[1] !== 'engine') {
                let name = match[2];
                if (match[1] === 'method') {
                    const index = name.indexOf('(');
                    if (index !== -1) {
                        name = name.substring(0, index);
                    }
                }
                fullname = fullname === '' ? name : (match[1] === 'method' ? fullname + '#' + name : fullname + '.' + name);
            }
        } while (match);
        return fullname;
    }
    parseTestStatus(status) {
        switch (status) {
            case JUnit5TestStatus.FAILED:
                return protocols_1.TestStatus.Fail;
            case JUnit5TestStatus.SUCCESSFUL:
                return protocols_1.TestStatus.Pass;
            case JUnit5TestStatus.ABORTED:
                return protocols_1.TestStatus.Skipped;
        }
    }
}
JUnit5RunnerResultAnalyzer.regex = /@@<({[^@]*})>/gm;
exports.JUnit5RunnerResultAnalyzer = JUnit5RunnerResultAnalyzer;
var JUnit5TestType;
(function (JUnit5TestType) {
    JUnit5TestType["TEST"] = "TEST";
    JUnit5TestType["CONTAINER"] = "CONTAINER";
})(JUnit5TestType = exports.JUnit5TestType || (exports.JUnit5TestType = {}));
var JUnit5TestStatus;
(function (JUnit5TestStatus) {
    JUnit5TestStatus["FAILED"] = "FAILED";
    JUnit5TestStatus["SUCCESSFUL"] = "SUCCESSFUL";
    JUnit5TestStatus["ABORTED"] = "ABORTED";
})(JUnit5TestStatus = exports.JUnit5TestStatus || (exports.JUnit5TestStatus = {}));
//# sourceMappingURL=junit5RunnerResultAnalyzer.js.map