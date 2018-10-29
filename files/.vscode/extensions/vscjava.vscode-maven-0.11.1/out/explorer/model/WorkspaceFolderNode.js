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
const vscode = require("vscode");
const vscode_1 = require("vscode");
const Utils_1 = require("../../Utils");
const MavenProjectNode_1 = require("./MavenProjectNode");
const NodeBase_1 = require("./NodeBase");
class WorkspaceFolderNode extends NodeBase_1.NodeBase {
    constructor(workspaceFolder) {
        super();
        this._workspaceFolder = workspaceFolder;
        this._children = [];
    }
    get pomPaths() {
        return this._pomPaths;
    }
    get children() {
        return this._children;
    }
    getChildren() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._searchForPomPaths();
            this._children = [];
            for (const pomPath of this._pomPaths) {
                const projectNode = new MavenProjectNode_1.MavenProjectNode(pomPath);
                if (yield projectNode.hasValidPom()) {
                    this._children.push(projectNode);
                }
            }
            this._sortChildren();
            return this._children;
        });
    }
    getTreeItem() {
        return new vscode.TreeItem(this._workspaceFolder.name, vscode_1.TreeItemCollapsibleState.Expanded);
    }
    _searchForPomPaths() {
        return __awaiter(this, void 0, void 0, function* () {
            this._pomPaths = yield Utils_1.Utils.getAllPomPaths(this._workspaceFolder);
        });
    }
    _sortChildren() {
        this._children.sort((a, b) => {
            return a.mavenProject.name > b.mavenProject.name ? 1 : a.mavenProject.name < b.mavenProject.name ? -1 : 0;
        });
    }
}
exports.WorkspaceFolderNode = WorkspaceFolderNode;
//# sourceMappingURL=WorkspaceFolderNode.js.map