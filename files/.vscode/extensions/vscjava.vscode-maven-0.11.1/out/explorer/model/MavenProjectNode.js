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
const path = require("path");
const vscode = require("vscode");
const Constants = require("../../Constants");
const Utils_1 = require("../../Utils");
const MavenProject_1 = require("./MavenProject");
const ModulesMenuNode_1 = require("./ModulesMenuNode");
const NodeBase_1 = require("./NodeBase");
class MavenProjectNode extends NodeBase_1.NodeBase {
    constructor(pomPath) {
        super();
        this._pomPath = pomPath;
    }
    getTreeItem() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.hasValidPom())) {
                return undefined;
            }
            const treeItem = new vscode.TreeItem(this._mavenProject.name);
            treeItem.iconPath = {
                light: Utils_1.Utils.getResourcePath("project.svg"),
                dark: Utils_1.Utils.getResourcePath("project.svg")
            };
            treeItem.contextValue = Constants.contextValue.MAVEN_PROJECT_NODE;
            treeItem.collapsibleState = this._hasModules ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
            treeItem.command = { title: "open pom", command: "maven.project.openPom", arguments: [this] };
            return treeItem;
        });
    }
    getChildren() {
        return this._hasModules ? [new ModulesMenuNode_1.ModulesMenuNode(this)] : [];
    }
    /**
     * @return list of absolute path of modules pom.xml.
     */
    get modules() {
        return this._mavenProject.modules.map(moduleName => path.join(path.dirname(this._pomPath), moduleName, "pom.xml"));
    }
    get pomPath() {
        return this._pomPath;
    }
    get mavenProject() {
        return this._mavenProject;
    }
    hasValidPom() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._parseMavenProject();
            return !!this._mavenProject;
        });
    }
    get _hasModules() {
        return this._mavenProject.modules.length > 0;
    }
    _parseMavenProject() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._mavenProject) {
                try {
                    const pom = yield Utils_1.Utils.parseXmlFile(this._pomPath);
                    this._mavenProject = new MavenProject_1.MavenProject(pom);
                }
                catch (error) {
                    // Error parsing pom.xml file
                }
            }
        });
    }
}
exports.MavenProjectNode = MavenProjectNode;
//# sourceMappingURL=MavenProjectNode.js.map