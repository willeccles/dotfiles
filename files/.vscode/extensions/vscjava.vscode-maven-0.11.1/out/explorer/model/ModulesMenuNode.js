"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const MavenProjectNode_1 = require("./MavenProjectNode");
const MenuNode_1 = require("./MenuNode");
class ModulesMenuNode extends MenuNode_1.MenuNode {
    constructor(projectNode) {
        super(projectNode);
        this._name = "Modules";
    }
    getChildren() {
        return this._projectNode.modules.map(modulePomPath => new MavenProjectNode_1.MavenProjectNode(modulePomPath));
    }
}
exports.ModulesMenuNode = ModulesMenuNode;
//# sourceMappingURL=ModulesMenuNode.js.map