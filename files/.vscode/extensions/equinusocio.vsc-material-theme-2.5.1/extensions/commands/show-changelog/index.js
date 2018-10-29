"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const paths_1 = require("./../../consts/paths");
const previewFile = () => {
    const uri = vscode.Uri.file(path.join(paths_1.PATHS.VSIX_DIR, './CHANGELOG.md'));
    vscode.commands.executeCommand('markdown.showPreview', uri);
};
exports.default = () => {
    const extname = 'vscode.markdown';
    const md = vscode.extensions.getExtension(extname);
    if (md === undefined) {
        console.warn(`Ext not found ${extname}`);
        return;
    }
    if (md.isActive) {
        return previewFile();
    }
    md.activate()
        .then(() => previewFile(), reason => console.warn(reason));
};
//# sourceMappingURL=index.js.map