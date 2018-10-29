"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const fs_1 = require("./fs");
const paths_1 = require("./../consts/paths");
const previewFile = () => {
    const uri = vscode.Uri.file(path.join(paths_1.PATHS.VSIX_DIR, './CHANGELOG.md'));
    vscode.commands.executeCommand('markdown.showPreview', uri);
};
const splitVersion = (input) => {
    const [major, minor, patch] = input.split('.').map(i => parseInt(i, 10));
    return { major, minor, patch };
};
const writeDefaults = (defaults) => fs_1.writeFile(path.join('./extensions/defaults.json'), JSON.stringify(defaults, null, 2));
exports.showChangelog = () => {
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
exports.shouldShowChangelog = () => {
    const defaults = fs_1.getDefaultValues();
    const packageJSON = fs_1.getPackageJSON();
    const defaultsNotPresent = defaults.changelog === undefined ||
        (defaults.changelog !== undefined && typeof defaults.changelog.lastversion !== 'string');
    const versionCurrent = splitVersion(packageJSON.version);
    const versionOld = defaultsNotPresent ? null : splitVersion(defaults.changelog.lastversion);
    const out = !versionOld ||
        versionCurrent.major > versionOld.major ||
        versionCurrent.minor > versionOld.minor ||
        versionCurrent.patch > versionOld.patch;
    const newChangelog = Object.assign({}, defaults.changelog, { lastversion: packageJSON.version });
    const newDefaults = Object.assign({}, defaults, { changelog: newChangelog });
    writeDefaults(newDefaults);
    return out;
};
//# sourceMappingURL=changelog.js.map