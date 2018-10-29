'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const packageVersion_1 = require("./packageVersion");
const util = require("./common");
const tmp = require("tmp");
const platform_1 = require("./platform");
function getVsixDownloadUrl(build, vsixName) {
    const downloadUrl = build.assets.find(asset => {
        return asset.name === vsixName;
    }).browser_download_url;
    if (!downloadUrl) {
        throw new Error('Failed to find VSIX: ' + vsixName + ' in build: ' + build.name);
    }
    return downloadUrl;
}
function isAsset(input) {
    return input && input.name && typeof (input.name) === "string" &&
        input.browser_download_url && typeof (input.browser_download_url) === "string";
}
function isBuild(input) {
    return input && input.name && typeof (input.name) === "string" && isArrayOfAssets(input.assets) && input.assets.length >= 4;
}
function isArrayOfAssets(input) {
    return input instanceof Array && input.every(item => isAsset(item));
}
function isArrayOfBuilds(input) {
    if (!input || !(input instanceof Array) || input.length === 0) {
        return false;
    }
    for (let i = 0; i < 5 && i < input.length; i++) {
        if (!isBuild(input[i])) {
            return false;
        }
    }
    return true;
}
function vsixNameForPlatform(info) {
    const vsixName = function (platformInfo) {
        switch (platformInfo.platform) {
            case 'win32': return 'cpptools-win32.vsix';
            case 'darwin': return 'cpptools-osx.vsix';
            default: {
                switch (platformInfo.architecture) {
                    case 'x86': return 'cpptools-linux32.vsix';
                    case 'x86_64': return 'cpptools-linux.vsix';
                }
            }
        }
    }(info);
    if (!vsixName) {
        throw new Error('Failed to match VSIX name for: ' + info.platform + ':' + info.architecture);
    }
    return vsixName;
}
function getTargetBuildInfo(updateChannel) {
    return __awaiter(this, void 0, void 0, function* () {
        return getReleaseJson()
            .then(builds => getTargetBuild(builds, updateChannel))
            .then((build) => __awaiter(this, void 0, void 0, function* () {
            if (!build) {
                return Promise.resolve(undefined);
            }
            try {
                const platformInfo = yield platform_1.PlatformInformation.GetPlatformInformation();
                const vsixName = vsixNameForPlatform(platformInfo);
                const downloadUrl = getVsixDownloadUrl(build, vsixName);
                return { downloadUrl: downloadUrl, name: build.name };
            }
            catch (error) {
                return Promise.reject(error);
            }
        }));
    });
}
exports.getTargetBuildInfo = getTargetBuildInfo;
function getTargetBuild(builds, updateChannel) {
    let needsUpdate;
    let useBuild;
    if (updateChannel === 'Insiders') {
        needsUpdate = (installed, target) => { return target.isGreaterThan(installed); };
        useBuild = (build) => { return true; };
    }
    else if (updateChannel === 'Default') {
        needsUpdate = function (installed, target) { return installed.isGreaterThan(target); };
        useBuild = (build) => { return build.name.indexOf('-') === -1; };
    }
    else {
        throw new Error('Incorrect updateChannel setting provided');
    }
    const targetBuild = builds.find((build) => useBuild(build));
    if (!targetBuild) {
        throw new Error('Failed to determine installation candidate');
    }
    const userVersion = new packageVersion_1.PackageVersion(util.packageJson.version);
    const targetVersion = new packageVersion_1.PackageVersion(targetBuild.name);
    return needsUpdate(userVersion, targetVersion) ? targetBuild : undefined;
}
function getReleaseJson() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            tmp.file((err, releaseJsonPath, fd, cleanupCallback) => __awaiter(this, void 0, void 0, function* () {
                if (err) {
                    reject(new Error('Failed to create release json file'));
                    return;
                }
                try {
                    const releaseUrl = 'https://api.github.com/repos/Microsoft/vscode-cpptools/releases';
                    const header = { 'User-Agent': 'vscode-cpptools' };
                    yield util.downloadFileToDestination(releaseUrl, releaseJsonPath, header)
                        .catch(() => { throw new Error('Failed to download release JSON'); });
                    const fileContent = yield util.readFileText(releaseJsonPath)
                        .catch(() => { throw new Error('Failed to read release JSON file'); });
                    let releaseJson;
                    try {
                        releaseJson = JSON.parse(fileContent);
                    }
                    catch (error) {
                        throw new Error('Failed to parse release JSON');
                    }
                    if (isArrayOfBuilds(releaseJson)) {
                        resolve(releaseJson);
                    }
                    else {
                        reject(releaseJson);
                    }
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    });
}
//# sourceMappingURL=githubAPI.js.map