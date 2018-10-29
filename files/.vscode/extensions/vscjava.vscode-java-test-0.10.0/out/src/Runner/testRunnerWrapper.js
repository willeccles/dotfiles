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
const cp = require("child_process");
const kill = require("tree-kill");
const vscode_1 = require("vscode");
const testStatusBarProvider_1 = require("../testStatusBarProvider");
const Configs = require("../Constants/configs");
const protocols_1 = require("../Models/protocols");
const Logger = require("../Utils/Logger/logger");
class TestRunnerWrapper {
    static registerRunner(kind, runner) {
        TestRunnerWrapper.runnerPool.set(kind, runner);
    }
    static run(tests, isDebugMode, config) {
        return __awaiter(this, void 0, void 0, function* () {
            if (TestRunnerWrapper.running) {
                vscode_1.window.showInformationMessage('A test session is currently running. Please wait until it finishes.');
                Logger.info('Skip this run cause we only support running one session at the same time');
                return;
            }
            TestRunnerWrapper.running = true;
            try {
                TestRunnerWrapper.classifyTests(tests);
                yield testStatusBarProvider_1.TestStatusBarProvider.getInstance().update(tests, (() => __awaiter(this, void 0, void 0, function* () {
                    for (const [runner, t] of this.runners.entries()) {
                        if (config && config.preLaunchTask.length > 0) {
                            try {
                                this.preLaunchTask = cp.exec(config.preLaunchTask, {
                                    maxBuffer: Configs.CHILD_PROCESS_MAX_BUFFER_SIZE,
                                    cwd: config.workingDirectory,
                                });
                                yield this.execPreLaunchTask();
                            }
                            finally {
                                this.preLaunchTask = undefined;
                            }
                        }
                        const params = yield runner.setup(t, isDebugMode, config);
                        yield runner.run(params).then((res) => __awaiter(this, void 0, void 0, function* () {
                            this.updateTestStorage(t, res);
                            yield runner.postRun();
                        }), ([error, res]) => __awaiter(this, void 0, void 0, function* () {
                            this.updateTestStorage(t, res);
                            yield runner.postRun();
                            throw error;
                        }));
                    }
                }))());
            }
            finally {
                TestRunnerWrapper.running = false;
            }
        });
    }
    static cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.preLaunchTask) {
                return new Promise((resolve, reject) => {
                    kill(this.preLaunchTask.pid, 'SIGTERM', (err) => {
                        if (err) {
                            Logger.error('Failed to cancel this prelaunch task.', {
                                error: err,
                            });
                            return reject(err);
                        }
                        resolve();
                    });
                });
            }
            else {
                const tasks = [];
                TestRunnerWrapper.runners.forEach((_ts, runner) => tasks.push(runner.cancel()));
                yield Promise.all(tasks);
                return Promise.resolve();
            }
        });
    }
    static classifyTests(tests) {
        const testsPerProject = tests.reduce((rp, rt) => {
            const key = rt.project.concat(rt.kind.toString());
            if (!rp.has(key)) {
                rp.set(key, [rt]);
            }
            else {
                rp.get(key).push(rt);
            }
            return rp;
        }, new Map());
        TestRunnerWrapper.runners = [...testsPerProject.values()].reduce((map, ts) => {
            const runner = this.getRunner(ts[0]);
            if (runner === null) {
                Logger.warn(`Cannot find matched runner to run the test: ${ts[0].test}`, {
                    test: ts[0],
                });
                return map;
            }
            map.set(runner.clone(), ts);
            return map;
        }, new Map());
    }
    static getRunner(test) {
        if (!TestRunnerWrapper.runnerPool.has(test.kind)) {
            return null;
        }
        return TestRunnerWrapper.runnerPool.get(test.kind);
    }
    static updateTestStorage(tests, result) {
        const mapper = result.reduce((total, cur) => {
            total.set(cur.test, cur.result);
            return total;
        }, new Map());
        const classesInflucenced = [];
        const flattenedTests = new Set(tests.map((t) => [t, t.parent, ...(t.children || [])])
            .reduce((total, cur) => total.concat(cur), [])
            .filter((t) => t));
        flattenedTests.forEach((t) => {
            if (mapper.has(t.test)) {
                t.result = mapper.get(t.test);
            }
            else if (t.level === protocols_1.TestLevel.Class) {
                classesInflucenced.push(t);
            }
        });
        classesInflucenced.forEach((c) => this.processClass(c));
    }
    static processClass(t) {
        let passNum = 0;
        let failNum = 0;
        let skipNum = 0;
        let duration = 0;
        let notRun = false;
        for (const child of t.children) {
            if (!child.result) {
                notRun = true;
                continue;
            }
            duration += Number(child.result.duration);
            switch (child.result.status) {
                case protocols_1.TestStatus.Pass:
                    passNum++;
                    break;
                case protocols_1.TestStatus.Fail:
                    failNum++;
                    break;
                case protocols_1.TestStatus.Skipped:
                    skipNum++;
                    break;
            }
        }
        t.result = {
            status: notRun ? undefined : (skipNum === t.children.length ? protocols_1.TestStatus.Skipped : (failNum > 0 ? protocols_1.TestStatus.Fail : protocols_1.TestStatus.Pass)),
            summary: `Tests run: ${passNum + failNum}, Failures: ${failNum}, Skipped: ${skipNum}.`,
            duration: notRun ? undefined : duration.toString(),
        };
    }
    static execPreLaunchTask() {
        return new Promise((resolve, reject) => {
            this.preLaunchTask.on('error', (err) => {
                Logger.error(`Error occurred while executing prelaunch task.`, {
                    name: err.name,
                    message: err.message,
                    stack: err.stack,
                });
                reject(err);
            });
            this.preLaunchTask.stderr.on('data', (data) => {
                Logger.error(`Error occurred: ${data.toString()}`);
            });
            this.preLaunchTask.stdout.on('data', (data) => {
                Logger.info(data.toString());
            });
            this.preLaunchTask.on('close', (signal) => {
                if (signal && signal !== 0) {
                    reject(`Prelaunch task exited with code ${signal}.`);
                }
                else {
                    resolve(signal);
                }
            });
        });
    }
}
TestRunnerWrapper.runnerPool = new Map();
TestRunnerWrapper.running = false;
exports.TestRunnerWrapper = TestRunnerWrapper;
//# sourceMappingURL=testRunnerWrapper.js.map