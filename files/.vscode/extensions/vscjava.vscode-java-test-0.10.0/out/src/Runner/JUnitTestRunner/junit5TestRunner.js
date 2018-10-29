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
const glob = require("glob");
const path = require("path");
const protocols_1 = require("../../Models/protocols");
const jarFileTestRunner_1 = require("../JarFileRunner/jarFileTestRunner");
const junit5RunnerResultAnalyzer_1 = require("./junit5RunnerResultAnalyzer");
class JUnit5TestRunner extends jarFileTestRunner_1.JarFileTestRunner {
    get debugConfigName() {
        return 'Debug Junit5 Test';
    }
    get runnerJarFilePath() {
        const serverHome = path.resolve(__dirname, '../../../../server');
        const launchersFound = glob.sync('**/com.microsoft.java.test.runner.junit5-*-jar-with-dependencies.jar', { cwd: serverHome });
        if (launchersFound.length) {
            return path.resolve(serverHome, launchersFound[0]);
        }
        else {
            return null;
        }
    }
    get runnerClassName() {
        return 'com.microsoft.java.test.runner.junit5.CustomizedConsoleLauncher';
    }
    constructCommand(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let commandParams = [];
            commandParams.push(path.resolve(this._javaHome + '/bin/java'));
            commandParams.push('-cp');
            const classpathStr = params.classpathStr;
            commandParams.push(classpathStr);
            if (params.isDebugMode) {
                const debugParams = [];
                debugParams.push('-Xdebug');
                const port = params.port;
                debugParams.push('-Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=' + port);
                commandParams = [...commandParams, ...debugParams];
            }
            if (params.config) {
                if (params.config.vmargs.length > 0) {
                    commandParams = [...commandParams, ...params.config.vmargs];
                }
                if (params.config.args.length > 0) {
                    commandParams = [...commandParams, ...params.config.args];
                }
            }
            commandParams.push(this.runnerClassName);
            const suites = params.tests.map((t) => t.level === protocols_1.TestLevel.Method ? ['-m', t.test] : ['-c', t.test])
                .reduce((a, b) => a.concat(b), []);
            commandParams = [...commandParams, ...suites];
            return commandParams;
        });
    }
    getTestResultAnalyzer(params) {
        return new junit5RunnerResultAnalyzer_1.JUnit5RunnerResultAnalyzer(params.tests);
    }
    clone() {
        return new JUnit5TestRunner(this._javaHome, this._storagePath, this._classPathManager, this._projectManager, this._onDidChange);
    }
}
exports.JUnit5TestRunner = JUnit5TestRunner;
//# sourceMappingURL=junit5TestRunner.js.map