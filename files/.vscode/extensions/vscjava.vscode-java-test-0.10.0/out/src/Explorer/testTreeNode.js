"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
class TestTreeNode {
    constructor(_name, _uri, _range, _parent, _children, _level = TestTreeNodeType.Method) {
        this._name = _name;
        this._uri = _uri;
        this._range = _range;
        this._parent = _parent;
        this._children = _children;
        this._level = _level;
    }
    get name() {
        return this._name;
    }
    get fullName() {
        const prefix = this._parent && this._parent.level !== TestTreeNodeType.Folder ? `${this._parent.fullName}` : '';
        if (prefix === '') {
            return this._name;
        }
        return prefix + (this.level === TestTreeNodeType.Method ? '#' : '.') + this._name;
    }
    get uri() {
        return this._uri;
    }
    get range() {
        return this._range;
    }
    get isFolder() {
        return this.level !== TestTreeNodeType.Method;
    }
    get children() {
        return this._children;
    }
    set children(c) {
        this._children = c;
    }
    get parent() {
        return this._parent;
    }
    set parent(c) {
        this._parent = c;
    }
    get level() {
        return this._level;
    }
}
exports.TestTreeNode = TestTreeNode;
var TestTreeNodeType;
(function (TestTreeNodeType) {
    TestTreeNodeType[TestTreeNodeType["Method"] = 0] = "Method";
    TestTreeNodeType[TestTreeNodeType["Class"] = 1] = "Class";
    TestTreeNodeType[TestTreeNodeType["Package"] = 2] = "Package";
    TestTreeNodeType[TestTreeNodeType["Folder"] = 3] = "Folder";
})(TestTreeNodeType = exports.TestTreeNodeType || (exports.TestTreeNodeType = {}));
//# sourceMappingURL=testTreeNode.js.map