"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proc = require("../proc");
const util = require("../util");
async function getCMakeExecutableInformation(path) {
    const cmake = {
        path,
        isPresent: false,
        minimalServerModeVersion: util.parseVersion('3.7.1'),
    };
    if (path.length != 0) {
        try {
            const version_ex = await proc.execute(path, ['--version']).result;
            if (version_ex.retc === 0 && version_ex.stdout) {
                cmake.isPresent = true;
                console.assert(version_ex.stdout);
                const version_re = /cmake.* version (.*?)\r?\n/;
                cmake.version = util.parseVersion(version_re.exec(version_ex.stdout)[1]);
                // We purposefully exclude versions <3.7.1, which have some major CMake
                // server bugs
                cmake.isServerModeSupported = util.versionGreater(cmake.version, cmake.minimalServerModeVersion);
            }
        }
        catch (ex) {
            if (ex.code != 'ENOENT') {
                throw ex;
            }
        }
    }
    return cmake;
}
exports.getCMakeExecutableInformation = getCMakeExecutableInformation;
//# sourceMappingURL=cmake-executable.js.map