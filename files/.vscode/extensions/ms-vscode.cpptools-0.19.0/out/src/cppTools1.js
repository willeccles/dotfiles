'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_cpptools_1 = require("vscode-cpptools");
const cppTools_1 = require("./cppTools");
class CppTools1 {
    get BackupApi() {
        if (!this.backupApi) {
            this.backupApi = new cppTools_1.CppTools(vscode_cpptools_1.Version.v0);
        }
        return this.backupApi;
    }
    getApi(version) {
        switch (version) {
            case vscode_cpptools_1.Version.v0:
                return this.BackupApi;
            default:
                return new cppTools_1.CppTools(version);
        }
    }
    getTestApi(version) {
        return this.getApi(version);
    }
    getVersion() {
        return this.BackupApi.getVersion();
    }
    registerCustomConfigurationProvider(provider) {
        this.BackupApi.registerCustomConfigurationProvider(provider);
    }
    notifyReady(provider) {
        this.BackupApi.notifyReady(provider);
    }
    didChangeCustomConfiguration(provider) {
        this.BackupApi.didChangeCustomConfiguration(provider);
    }
    didChangeCustomBrowseConfiguration(provider) {
        this.BackupApi.didChangeCustomBrowseConfiguration(provider);
    }
    dispose() {
    }
    getTestHook() {
        return this.BackupApi.getTestHook();
    }
}
exports.CppTools1 = CppTools1;
//# sourceMappingURL=cppTools1.js.map