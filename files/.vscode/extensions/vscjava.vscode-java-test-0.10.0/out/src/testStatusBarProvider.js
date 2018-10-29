"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const Commands = require("./Constants/commands");
const protocols_1 = require("./Models/protocols");
const commandUtility_1 = require("./Utils/commandUtility");
const Logger = require("./Utils/Logger/logger");
class TestStatusBarProvider {
    constructor() {
        this.statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, Number.MIN_VALUE);
    }
    static getInstance() {
        return TestStatusBarProvider.instance;
    }
    dispose() {
        this.statusBarItem.dispose();
    }
    init(action) {
        return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Window }, (p) => {
            p.report({ message: 'Loading tests...' });
            this.statusBarItem.show();
            return action.then(null, (reason) => {
                this.statusBarItem.text = 'Failed to load tests';
                Logger.error('Failed to load tests.', {
                    error: reason,
                });
            });
        });
    }
    update(tests, action) {
        this.statusBarItem.text = `$(sync~spin) Running tests...`;
        this.statusBarItem.color = 'white';
        this.statusBarItem.tooltip = 'View test output';
        this.statusBarItem.command = Commands.JAVA_TEST_SHOW_OUTPUT;
        return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Notification, title: 'Running tests', cancellable: true }, (p, token) => {
            token.onCancellationRequested(() => {
                Logger.info('User canceled the long running operation');
                vscode_1.commands.executeCommand(Commands.JAVA_TEST_CANCEL);
            });
            p.report({ message: 'Running tests...' });
            return action.then(() => {
                this.updateStatus(tests);
            }, (reason) => {
                this.statusBarItem.text = 'Failed to run tests';
                this.statusBarItem.color = 'red';
                if (tests) {
                    this.statusBarItem.command = commandUtility_1.CommandUtility.getCommandWithArgs(Commands.JAVA_TEST_SHOW_REPORT, [tests]);
                }
                Logger.error('Failed to run tests.', {
                    error: reason,
                });
                return Promise.reject(reason);
            });
        });
    }
    updateStatus(tests) {
        const testMethods = tests.map((t) => t.level === protocols_1.TestLevel.Method ? [t] : t.children)
            .reduce((a, b) => a.concat(b));
        let failedCount = 0;
        let passedCount = 0;
        for (const t of testMethods) {
            if (t.level !== protocols_1.TestLevel.Method || !t.result) {
                continue;
            }
            if (t.result.status === protocols_1.TestStatus.Fail) {
                failedCount++;
            }
            else if (t.result.status === protocols_1.TestStatus.Pass) {
                passedCount++;
            }
        }
        this.statusBarItem.text = `$(x) ${failedCount} $(check) ${passedCount}`;
        this.statusBarItem.color = failedCount > 0 ? 'red' : '#66ff66';
        this.statusBarItem.tooltip = 'View test report';
        this.statusBarItem.command = commandUtility_1.CommandUtility.getCommandWithArgs(Commands.JAVA_TEST_SHOW_REPORT, [tests]);
    }
}
TestStatusBarProvider.instance = new TestStatusBarProvider();
exports.TestStatusBarProvider = TestStatusBarProvider;
//# sourceMappingURL=testStatusBarProvider.js.map