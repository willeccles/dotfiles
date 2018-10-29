"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const Utils_1 = require("../../Utils");
const NodeBase_1 = require("./NodeBase");
class MenuNode extends NodeBase_1.NodeBase {
    constructor(projectNode) {
        super();
        this._projectNode = projectNode;
    }
    getTreeItem() {
        const treeItem = new vscode.TreeItem(this._name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            light: Utils_1.Utils.getResourcePath("light", "folder.svg"),
            dark: Utils_1.Utils.getResourcePath("dark", "folder.svg")
        };
        return treeItem;
    }
}
exports.MenuNode = MenuNode;
//# sourceMappingURL=MenuNode.js.map