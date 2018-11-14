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
                    case 'x86_64': return 'cpptools-linux.vsix';
                    case 'x86':
                    case 'i386':
                    case 'i686': return 'cpptools-linux32.vsix';
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
            .then(builds => {
            if (!builds || builds.length === 0) {
                return undefined;
            }
            const userVersion = new packageVersion_1.PackageVersion(util.packageJson.version);
            const latestVersion = new packageVersion_1.PackageVersion(builds[0].name);
            if (userVersion.isGreaterThan(latestVersion) || (userVersion.suffix && userVersion.suffix !== 'insiders')) {
                return undefined;
            }
            return getTargetBuild(builds, userVersion, updateChannel);
        })
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
function getTargetBuild(builds, userVersion, updateChannel) {
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
    const targetVersion = new packageVersion_1.PackageVersion(targetBuild.name);
    return needsUpdate(userVersion, targetVersion) ? targetBuild : undefined;
}
function isRate(input) {
    return input && input.remaining && util.isNumber(input.remaining);
}
function isRateLimit(input) {
    return input && isRate(input.rate);
}
function getRateLimit() {
    return __awaiter(this, void 0, void 0, function* () {
        const header = { 'User-Agent': 'vscode-cpptools' };
        const data = yield util.downloadFileToStr('https://api.github.com/rate_limit', header)
            .catch(() => { throw new Error('Failed to download rate limit JSON'); });
        let rateLimit;
        try {
            rateLimit = JSON.parse(data);
        }
        catch (error) {
            throw new Error('Failed to parse rate limit JSON');
        }
        if (isRateLimit(rateLimit)) {
            return Promise.resolve(rateLimit);
        }
        else {
            throw new Error('Rate limit JSON is not of type RateLimit');
        }
    });
}
function rateLimitExceeded() {
    return __awaiter(this, void 0, void 0, function* () {
        const rateLimit = yield getRateLimit();
        return rateLimit.rate.remaining <= 0;
    });
}
function getReleaseJson() {
    return __awaiter(this, void 0, void 0, function* () {
        if (yield rateLimitExceeded()) {
            throw new Error('Failed to stay within GitHub API rate limit');
        }
        const releaseUrl = 'https://api.github.com/repos/Microsoft/vscode-cpptools/releases';
        const header = { 'User-Agent': 'vscode-cpptools' };
        const data = yield util.downloadFileToStr(releaseUrl, header)
            .catch(() => { throw new Error('Failed to download release JSON'); });
        let releaseJson;
        try {
            releaseJson = JSON.parse(data);
        }
        catch (error) {
            throw new Error('Failed to parse release JSON');
        }
        if (isArrayOfBuilds(releaseJson)) {
            return releaseJson;
        }
        else {
            throw new Error('Release JSON is not of type Build[]');
        }
    });
}
//# sourceMappingURL=githubAPI.js.map