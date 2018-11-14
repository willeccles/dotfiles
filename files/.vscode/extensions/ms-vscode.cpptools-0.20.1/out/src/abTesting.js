'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("./common");
const Telemetry = require("./telemetry");
const persistentState_1 = require("./LanguageServer/persistentState");
const fs = require("fs");
const userBucketMax = 100;
const userBucketString = "CPP.UserBucket";
const localConfigFile = "cpptools.json";
class ABTestSettings {
    constructor() {
        this.intelliSenseEngineDefault = new persistentState_1.PersistentState("ABTest.1", 100);
        this.recursiveIncludesDefault = new persistentState_1.PersistentState("ABTest.2", 100);
        this.gotoDefIntelliSenseDefault = new persistentState_1.PersistentState("ABTest.3", 100);
        this.settings = {
            defaultIntelliSenseEngine: this.intelliSenseEngineDefault.Value,
            recursiveIncludes: this.recursiveIncludesDefault.Value,
            gotoDefIntelliSense: this.gotoDefIntelliSenseDefault.Value
        };
        this.bucket = new persistentState_1.PersistentState(userBucketString, -1);
        if (this.bucket.Value === -1) {
            this.bucket.Value = Math.floor(Math.random() * userBucketMax) + 1;
        }
        this.updateSettings();
        this.downloadCpptoolsJsonPkgAsync();
        setInterval(() => { this.downloadCpptoolsJsonPkgAsync(); }, 30 * 60 * 1000);
    }
    get UseDefaultIntelliSenseEngine() {
        return util.isNumber(this.settings.defaultIntelliSenseEngine) ? this.settings.defaultIntelliSenseEngine >= this.bucket.Value : true;
    }
    get UseRecursiveIncludes() {
        return util.isNumber(this.settings.recursiveIncludes) ? this.settings.recursiveIncludes >= this.bucket.Value : true;
    }
    get UseGoToDefIntelliSense() {
        return util.isNumber(this.settings.gotoDefIntelliSense) ? this.settings.gotoDefIntelliSense >= this.bucket.Value : true;
    }
    updateSettings() {
        const cpptoolsJsonFile = util.getExtensionFilePath(localConfigFile);
        try {
            const exists = fs.existsSync(cpptoolsJsonFile);
            if (exists) {
                const fileContent = fs.readFileSync(cpptoolsJsonFile).toString();
                let newSettings = JSON.parse(fileContent);
                this.intelliSenseEngineDefault.Value = util.isNumber(newSettings.defaultIntelliSenseEngine) ? newSettings.defaultIntelliSenseEngine : this.intelliSenseEngineDefault.DefaultValue;
                this.recursiveIncludesDefault.Value = util.isNumber(newSettings.recursiveIncludes) ? newSettings.recursiveIncludes : this.recursiveIncludesDefault.DefaultValue;
                this.gotoDefIntelliSenseDefault.Value = util.isNumber(newSettings.gotoDefIntelliSense) ? newSettings.gotoDefIntelliSense : this.gotoDefIntelliSenseDefault.DefaultValue;
                this.settings = {
                    defaultIntelliSenseEngine: this.intelliSenseEngineDefault.Value,
                    recursiveIncludes: this.recursiveIncludesDefault.Value,
                    gotoDefIntelliSense: this.gotoDefIntelliSenseDefault.Value
                };
            }
        }
        catch (error) {
        }
    }
    downloadCpptoolsJsonPkgAsync() {
        let hasError = false;
        let telemetryProperties = {};
        const localConfigPath = util.getExtensionFilePath(localConfigFile);
        return util.downloadFileToDestination("https://go.microsoft.com/fwlink/?linkid=2026205", localConfigPath)
            .catch((error) => {
            hasError = true;
        })
            .then(() => {
            this.updateSettings();
            telemetryProperties['success'] = (!hasError).toString();
            Telemetry.logDebuggerEvent("cpptoolsJsonDownload", telemetryProperties);
        });
    }
}
exports.ABTestSettings = ABTestSettings;
let settings;
function getABTestSettings() {
    if (!settings) {
        settings = new ABTestSettings();
    }
    return settings;
}
exports.getABTestSettings = getABTestSettings;
//# sourceMappingURL=abTesting.js.map