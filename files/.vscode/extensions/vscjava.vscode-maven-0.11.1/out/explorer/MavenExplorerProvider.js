"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const WorkspaceFolderNode_1 = require("./model/WorkspaceFolderNode");
class MavenExplorerProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.refresh();
    }
    get mavenProjectNodes() {
        return Array.prototype.concat.apply([], this._workspaceFolderNodes.map(ws => ws.children));
    }
    getTreeItem(element) {
        return element.getTreeItem();
    }
    getChildren(element) {
        if (element === undefined) {
            return this._workspaceFolderNodes;
        }
        else {
            return element.getChildren();
        }
    }
    refresh() {
        this._updateWorkspaceFolderNodes();
        this._onDidChangeTreeData.fire();
    }
    _updateWorkspaceFolderNodes() {
        this._workspaceFolderNodes = vscode.workspace.workspaceFolders ?
            vscode.workspace.workspaceFolders.map(workspaceFolder => new WorkspaceFolderNode_1.WorkspaceFolderNode(workspaceFolder)) :
            [];
    }
}
exports.MavenExplorerProvider = MavenExplorerProvider;
//# sourceMappingURL=MavenExplorerProvider.js.map