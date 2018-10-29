"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const Commands = require("../Constants/commands");
const protocols_1 = require("../Models/protocols");
const testRunnerWrapper_1 = require("../Runner/testRunnerWrapper");
const testTreeNode_1 = require("./testTreeNode");
class TestExplorer {
    constructor(_context, _testCollectionStorage) {
        this._context = _context;
        this._testCollectionStorage = _testCollectionStorage;
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        // tslint:disable-next-line
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return {
            label: this.getFriendlyElementName(element),
            collapsibleState: element.isFolder ? vscode_1.TreeItemCollapsibleState.Collapsed : void 0,
            command: this.getCommand(element),
            iconPath: this.getIconPath(element),
            contextValue: element.level.toString(),
        };
    }
    getChildren(element) {
        let children;
        if (element) {
            children = element.children;
        }
        else {
            const tests = this._testCollectionStorage.getAll().filter((t) => t.level === protocols_1.TestLevel.Method);
            children = this.createTestTreeNode(tests, undefined, testTreeNode_1.TestTreeNodeType.Folder);
        }
        return children.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }
    select(element) {
        const uri = vscode_1.Uri.parse(element.uri);
        vscode_1.workspace.openTextDocument(uri).then((doc) => {
            return vscode_1.window.showTextDocument(doc, {
                preserveFocus: true,
                selection: element.range,
            });
        });
    }
    run(element, debugMode, config) {
        return testRunnerWrapper_1.TestRunnerWrapper.run(this.resolveTestSuites(element), debugMode, config);
    }
    resolveTestSuites(element) {
        if (!element) {
            return this.getChildren(element).map((f) => this.resolveTestSuites(f)).reduce((a, b) => a.concat(b));
        }
        if (element.level === testTreeNode_1.TestTreeNodeType.Class || element.level === testTreeNode_1.TestTreeNodeType.Method) {
            return [this.toTestSuite(element)];
        }
        return element.children.map((c) => this.resolveTestSuites(c)).reduce((a, b) => a.concat(b));
    }
    createTestTreeNode(tests, parent, level) {
        if (level === testTreeNode_1.TestTreeNodeType.Method) {
            return tests.map((t) => new testTreeNode_1.TestTreeNode(this.getShortName(t), t.uri, t.range, parent, undefined));
        }
        const keyFunc = this.getGroupKeyFunc(level);
        const map = new Map();
        tests.forEach((t) => {
            const key = keyFunc(t);
            const collection = map.get(key);
            if (!collection) {
                map.set(key, [t]);
            }
            else {
                collection.push(t);
            }
        });
        const children = [...map.entries()].map((value) => {
            const uri = level === testTreeNode_1.TestTreeNodeType.Class ? value[1][0].uri : undefined;
            const c = new testTreeNode_1.TestTreeNode(value[0], uri, undefined, parent, undefined, level);
            c.children = this.createTestTreeNode(value[1], c, level - 1);
            return c;
        });
        return children;
    }
    getGroupKeyFunc(level) {
        switch (level) {
            case testTreeNode_1.TestTreeNodeType.Folder:
                return (_) => this.getWorkspaceFolder(_);
            case testTreeNode_1.TestTreeNodeType.Package:
                return (_) => _.packageName;
            case testTreeNode_1.TestTreeNodeType.Class:
                return (_) => this.getShortName(_.parent);
            default:
                throw new Error('Not supported group level');
        }
    }
    getWorkspaceFolder(test) {
        const folders = vscode_1.workspace.workspaceFolders;
        return folders.filter((f) => {
            const fp = vscode_1.Uri.parse(test.uri).fsPath;
            return fp.startsWith(f.uri.fsPath);
        }).map((f) => path.basename(f.uri.path))[0];
    }
    getShortName(test) {
        if (test.level === protocols_1.TestLevel.Method) {
            return test.test.substring(test.test.indexOf('#') + 1);
        }
        else {
            return test.test.substring(test.packageName === '' ? 0 : test.packageName.length + 1);
        }
    }
    getFriendlyElementName(element) {
        if (element.level === testTreeNode_1.TestTreeNodeType.Package && element.name === '') {
            return '(default package)';
        }
        return element.name;
    }
    getIconPath(element) {
        switch (element.level) {
            case testTreeNode_1.TestTreeNodeType.Method:
                return {
                    dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'method.svg')),
                    light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'method.svg')),
                };
            case testTreeNode_1.TestTreeNodeType.Class:
                return {
                    dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'class.svg')),
                    light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'class.svg')),
                };
            case testTreeNode_1.TestTreeNodeType.Package:
                return {
                    dark: this._context.asAbsolutePath(path.join('resources', 'media', 'dark', 'package.svg')),
                    light: this._context.asAbsolutePath(path.join('resources', 'media', 'light', 'package.svg')),
                };
            default:
                return undefined;
        }
    }
    getCommand(element) {
        if (element.level <= testTreeNode_1.TestTreeNodeType.Class) {
            return {
                command: Commands.JAVA_TEST_EXPLORER_SELECT,
                title: '',
                arguments: [element],
            };
        }
        return undefined;
    }
    toTestSuite(element) {
        const uri = vscode_1.Uri.parse(element.uri);
        const tests = this._testCollectionStorage.getTests(uri).tests;
        return tests.filter((t) => t.test === element.fullName)[0];
    }
}
exports.TestExplorer = TestExplorer;
//# sourceMappingURL=testExplorer.js.map