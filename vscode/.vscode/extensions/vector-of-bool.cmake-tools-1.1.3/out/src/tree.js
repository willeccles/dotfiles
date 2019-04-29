"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const rollbar_1 = require("./rollbar");
const util_1 = require("./util");
/**
 * Base class of nodes in all tree nodes
 */
class BaseNode {
    constructor(id) {
        this.id = id;
    }
}
/**
 * Add an item to a PathedTree at the given path. Updates intermediate branches
 * as necessary.
 * @param tree The tree to update
 * @param itemPath The path to the item to add
 * @param item The item which will be added
 */
function addToTree(tree, itemPath, item) {
    const elems = util_1.splitPath(itemPath);
    for (const el of elems) {
        let subtree = tree.children.find(n => n.pathPart === el);
        if (!subtree) {
            subtree = {
                pathPart: el,
                children: [],
                items: [],
            };
            tree.children.push(subtree);
        }
        tree = subtree;
    }
    tree.items.push(item);
}
/**
 * Collapse elements in the tree which contain only one child tree.
 * @param tree The tree to collapse
 */
function collapseTreeInplace(tree) {
    const new_children = [];
    for (let child of tree.children) {
        while (child.children.length === 1 && child.items.length === 0) {
            const subchild = child.children[0];
            child = {
                pathPart: path.join(child.pathPart, subchild.pathPart),
                items: subchild.items,
                children: subchild.children,
            };
        }
        collapseTreeInplace(child);
        new_children.push(child);
    }
    tree.children = new_children;
}
/**
 * Get the path to an icon for the given type of CMake target.
 * @param type The type of target
 */
function iconForTargetType(type) {
    switch (type) {
        case 'EXECUTABLE':
            return 'res/exe.svg';
        case 'MODULE_LIBRARY':
        case 'SHARED_LIBRARY':
        case 'OBJECT_LIBRARY':
        case 'INTERFACE_LIBRARY':
        case 'STATIC_LIBRARY':
            return 'res/lib.svg';
        case 'UTILITY':
            return 'res/build-icon.svg';
    }
}
function sortStringForType(type) {
    switch (type) {
        case 'EXECUTABLE':
            return 'aaa';
        case 'MODULE_LIBRARY':
        case 'SHARED_LIBRARY':
        case 'STATIC_LIBRARY':
            return 'baa';
        case 'UTILITY':
            return 'caa';
        case 'OBJECT_LIBRARY':
            return 'daa';
        case 'INTERFACE_LIBRARY':
            return 'eaa';
    }
}
class DirectoryNode extends BaseNode {
    constructor(prefix, parent, pathPart) {
        super(`${prefix}::${path.join(parent, pathPart)}`);
        this.prefix = prefix;
        this.parent = parent;
        this.pathPart = pathPart;
        this._subdirs = new Map();
        this._leaves = new Map();
    }
    getOrderTuple() { return [this.id]; }
    get fsPath() { return path.join(this.parent, this.pathPart); }
    getChildren() {
        const ret = [];
        const subdirs = [...this._subdirs.values()].sort((a, b) => a.pathPart.localeCompare(b.pathPart));
        ret.push(...subdirs);
        const leaves = [...this._leaves.values()].sort((a, b) => util_1.lexicographicalCompare(a.getOrderTuple(), b.getOrderTuple()));
        ret.push(...leaves);
        return ret;
    }
    getTreeItem() {
        const item = new vscode.TreeItem(this.pathPart, vscode.TreeItemCollapsibleState.Collapsed);
        item.resourceUri = vscode.Uri.file(this.fsPath);
        item.id = this.id;
        return item;
    }
    update(opts) {
        const new_subdirs = new Map();
        const new_leaves = new Map();
        let did_update = false;
        for (const new_subdir of opts.tree.children) {
            let existing = this._subdirs.get(new_subdir.pathPart);
            if (!existing) {
                existing = new DirectoryNode(this.id, this.fsPath, new_subdir.pathPart);
                did_update = true;
            }
            existing.update(Object.assign({}, opts, { tree: new_subdir }));
            new_subdirs.set(new_subdir.pathPart, existing);
        }
        for (const new_leaf of opts.tree.items) {
            let existing = this._leaves.get(new_leaf.name);
            if (!existing) {
                existing = opts.create(new_leaf);
                did_update = true;
            }
            else {
                opts.update(existing, new_leaf);
            }
            new_leaves.set(new_leaf.name, existing);
        }
        if (new_subdirs.size !== this._subdirs.size) {
            // We added/removed nodes
            did_update = true;
        }
        if (new_leaves.size != this._leaves.size) {
            // We added/removed leaves
            did_update = true;
        }
        this._subdirs = new_subdirs;
        this._leaves = new_leaves;
        if (did_update) {
            opts.context.nodesToUpdate.push(this);
        }
    }
}
exports.DirectoryNode = DirectoryNode;
class SourceFileNode extends BaseNode {
    constructor(targetName, filePath) {
        super(`${targetName}::${filePath}`);
        this.targetName = targetName;
        this.filePath = filePath;
    }
    get name() { return path.basename(this.filePath); }
    getChildren() { return []; }
    getOrderTuple() { return [this.name]; }
    getTreeItem() {
        const item = new vscode.TreeItem(path.basename(this.filePath));
        item.id = this.id;
        item.resourceUri = vscode.Uri.file(this.filePath);
        item.contextValue = 'nodeType=file';
        item.command = {
            title: 'Open file',
            command: 'vscode.open',
            arguments: [item.resourceUri],
        };
        return item;
    }
}
exports.SourceFileNode = SourceFileNode;
class TargetNode extends BaseNode {
    constructor(projectName, cm) {
        super(`${projectName}::${cm.name}`);
        this.projectName = projectName;
        this._fullName = '';
        this._type = 'UTILITY';
        this._isDefault = false;
        this._isLaunch = false;
        this._fsPath = '';
        this.name = cm.name;
        this.sourceDir = cm.sourceDirectory || '';
        this._rootDir = new DirectoryNode(this.id, this.sourceDir, '');
    }
    getOrderTuple() { return [sortStringForType(this._type), this.name]; }
    getChildren() { return this._rootDir.getChildren(); }
    getTreeItem() {
        try {
            const item = new vscode.TreeItem(this.name);
            if (this.getChildren().length) {
                item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            }
            if (this._isDefault) {
                item.label += ' 🔨';
            }
            if (this._isLaunch) {
                item.label += ' 🚀';
            }
            if (this._fullName != this.name && this._fullName) {
                item.label += ` [${this._fullName}]`;
            }
            if (this._type === 'INTERFACE_LIBRARY') {
                item.label += ' — Interface library';
            }
            else if (this._type === 'UTILITY') {
                item.label += ' — Utility';
            }
            else if (this._type === 'OBJECT_LIBRARY') {
                item.label += ' — Object library';
            }
            item.resourceUri = vscode.Uri.file(this._fsPath);
            item.tooltip = `Target ${this.name}`;
            if (this._isLaunch) {
                item.tooltip += ' [launch]';
            }
            if (this._isDefault) {
                item.tooltip += ' [default]';
            }
            const icon = iconForTargetType(this._type);
            item.iconPath = path.join(util_1.thisExtension().extensionPath, icon);
            item.id = this.id;
            const canBuild = this._type !== 'INTERFACE_LIBRARY' && this._type !== 'UTILITY' && this._type !== 'OBJECT_LIBRARY';
            const canRun = this._type === 'UTILITY';
            item.contextValue = [
                `nodeType=target`,
                `isDefault=${this._isDefault}`,
                `isLaunch=${this._isLaunch}`,
                `type=${this._type}`,
                `canBuild=${canBuild}`,
                `canRun=${canRun}`,
            ].join(',');
            return item;
        }
        catch (e) {
            debugger;
            return new vscode.TreeItem(`${this.name} (there was an issue rendering this item. This is a bug)`);
        }
    }
    update(cm, ctx) {
        console.assert(this.name == cm.name);
        console.assert(this.sourceDir == (cm.sourceDirectory || ''));
        let did_update = this._fullName !== (cm.fullName || '');
        this._fullName = cm.fullName || '';
        const old_fspath = this._fsPath;
        if (cm.artifacts && cm.artifacts.length) {
            this._fsPath = path.normalize(cm.artifacts[0]);
        }
        else {
            this._fsPath = cm.fullName || '';
        }
        did_update = did_update || old_fspath !== this._fsPath;
        did_update = did_update || (this._type !== cm.type);
        this._type = cm.type;
        const new_is_default = this.name === ctx.defaultTargetName;
        did_update = did_update || new_is_default !== this._isDefault;
        this._isDefault = new_is_default;
        const new_is_launch = this.name === ctx.launchTargetName;
        did_update = did_update || new_is_launch !== this._isLaunch;
        this._isLaunch = new_is_launch;
        const tree = {
            pathPart: this.sourceDir,
            items: [],
            children: [],
        };
        for (const grp of cm.fileGroups || []) {
            for (let src of grp.sources) {
                if (!path.isAbsolute(src)) {
                    src = path.join(this.sourceDir, src);
                }
                const src_dir = path.dirname(src);
                const relpath = path.relative(this.sourceDir, src_dir);
                addToTree(tree, relpath, new SourceFileNode(this.name, src));
            }
        }
        addToTree(tree, '', new SourceFileNode(this.name, path.join(this.sourceDir, 'CMakeLists.txt')));
        collapseTreeInplace(tree);
        this._rootDir.update({
            tree,
            context: ctx,
            update: (_src, _cm) => { },
            create: newNode => newNode,
        });
    }
    async openInCMakeLists() {
        const cml_path = path.join(this.sourceDir, 'CMakeLists.txt');
        const doc = await vscode.workspace.openTextDocument(cml_path);
        const editor = await vscode.window.showTextDocument(doc);
        const doc_text = doc.getText();
        const regex = new RegExp(`(add_|ADD_)\\w+\\([\\s\\n]*?${this.name}[\\s\\n\\)]`, 'g');
        const offset = doc_text.search(regex);
        if (offset >= 0) {
            const pos = doc.positionAt(offset);
            editor.revealRange(new vscode.Range(pos, pos.translate(2)));
            editor.selection = new vscode.Selection(pos, pos);
        }
    }
}
exports.TargetNode = TargetNode;
class ProjectNode extends BaseNode {
    constructor(name) {
        super(name);
        this.name = name;
        this._rootDir = new DirectoryNode('', '', '');
    }
    getOrderTuple() { return []; }
    getChildren() { return this._rootDir.getChildren(); }
    getTreeItem() {
        const item = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Expanded);
        if (this.getChildren().length === 0) {
            item.label += ' — (Empty project)';
        }
        return item;
    }
    update(pr, ctx) {
        if (pr.name !== this.name) {
            rollbar_1.default.error(`Update project with mismatching name property`, { newName: pr.name, oldName: this.name });
        }
        const tree = {
            pathPart: '',
            children: [],
            items: [],
        };
        for (const target of pr.targets) {
            const srcdir = target.sourceDirectory || '';
            const relpath = path.relative(pr.sourceDirectory, srcdir);
            addToTree(tree, relpath, target);
        }
        collapseTreeInplace(tree);
        this._rootDir.update({
            tree,
            context: ctx,
            update: (tgt, cm) => tgt.update(cm, ctx),
            create: cm => {
                const node = new TargetNode(this.name, cm);
                node.update(cm, ctx);
                return node;
            },
        });
        // const target_tree = mapTreeItems(tree, target => TargetNode.fromCodeModel(pr.name, target));
        // this._rootDir = DirectoryNode.fromSimpleTree(pr.name, pr.sourceDirectory, target_tree);
    }
}
class ProjectOutlineProvider {
    constructor() {
        this._changeEvent = new vscode.EventEmitter();
        this._children = [];
        this._codeModel = { configurations: [] };
    }
    get onDidChangeTreeData() { return this._changeEvent.event; }
    get codeModel() { return this._codeModel; }
    updateCodeModel(model, exCtx) {
        if (!model || model.configurations.length < 1) {
            return;
        }
        this._codeModel = model;
        const config = model.configurations[0];
        const updates = [];
        const new_children = [];
        for (const pr of config.projects) {
            const item = new ProjectNode(pr.name);
            item.update(pr, Object.assign({}, exCtx, { nodesToUpdate: updates }));
            new_children.push(item);
        }
        this._children = new_children;
        this._changeEvent.fire(null);
        for (const node of updates) {
            this._changeEvent.fire(node);
        }
    }
    getChildren(node) {
        try {
            if (!node) {
                // Request for root node
                return this._children;
            }
            else {
                return node.getChildren();
            }
        }
        catch (e) {
            rollbar_1.default.error('Error while rendering children nodes');
            return [];
        }
    }
    async getTreeItem(node) { return node.getTreeItem(); }
}
exports.ProjectOutlineProvider = ProjectOutlineProvider;
//# sourceMappingURL=tree.js.map