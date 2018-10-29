"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs_1 = require("./fs");
const splitVersion = (input) => {
    const [major, minor, patch] = input.split('.').map(i => parseInt(i, 10));
    return { major, minor, patch };
};
const writeDefaults = (defaults) => fs_1.writeFile(path.join('./extensions/defaults.json'), JSON.stringify(defaults, null, 2));
exports.default = () => {
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
//# sourceMappingURL=should-show-changelog.js.map