'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_cpptools_1 = require("vscode-cpptools");
const customProviders_1 = require("./LanguageServer/customProviders");
const logger_1 = require("./logger");
const LanguageServer = require("./LanguageServer/extension");
const test = require("./testHook");
class CppTools {
    constructor(version) {
        this.providers = [];
        this.failedRegistrations = [];
        this.timers = new Map();
        if (version > vscode_cpptools_1.Version.latest) {
            console.warn(`version ${version} is not supported by this version of cpptools`);
            console.warn(`  using ${vscode_cpptools_1.Version.latest} instead`);
            version = vscode_cpptools_1.Version.latest;
        }
        this.version = version;
    }
    addNotifyReadyTimer(provider) {
        if (this.version >= vscode_cpptools_1.Version.v2) {
            const timeout = 30;
            let timer = setTimeout(() => {
                console.warn(`registered provider ${provider.extensionId} did not call 'notifyReady' within ${timeout} seconds`);
            }, timeout * 1000);
            this.timers.set(provider.extensionId, timer);
        }
    }
    removeNotifyReadyTimer(provider) {
        if (this.version >= vscode_cpptools_1.Version.v2) {
            let timer = this.timers.get(provider.extensionId);
            if (timer) {
                this.timers.delete(provider.extensionId);
                clearTimeout(timer);
            }
        }
    }
    getVersion() {
        return this.version;
    }
    registerCustomConfigurationProvider(provider) {
        let providers = customProviders_1.getCustomConfigProviders();
        if (providers.add(provider, this.version)) {
            let added = providers.get(provider);
            logger_1.getOutputChannel().appendLine(`Custom configuration provider '${added.name}' registered`);
            this.providers.push(added);
            LanguageServer.getClients().forEach(client => client.onRegisterCustomConfigurationProvider(added));
            this.addNotifyReadyTimer(added);
        }
        else {
            this.failedRegistrations.push(provider);
        }
    }
    notifyReady(provider) {
        let providers = customProviders_1.getCustomConfigProviders();
        let p = providers.get(provider);
        if (p) {
            this.removeNotifyReadyTimer(p);
            p.isReady = true;
            LanguageServer.getClients().forEach(client => {
                client.updateCustomConfigurations(p);
                client.updateCustomBrowseConfiguration(p);
            });
        }
        else if (this.failedRegistrations.find(p => p === provider)) {
            console.warn("provider not successfully registered, 'notifyReady' ignored");
        }
        else {
            console.warn("provider should be registered before signaling it's ready to provide configurations");
        }
    }
    didChangeCustomConfiguration(provider) {
        let providers = customProviders_1.getCustomConfigProviders();
        let p = providers.get(provider);
        if (p) {
            if (!p.isReady) {
                console.warn("didChangeCustomConfiguration was invoked before notifyReady");
            }
            LanguageServer.getClients().forEach(client => client.updateCustomConfigurations(p));
        }
        else if (this.failedRegistrations.find(p => p === provider)) {
            console.warn("provider not successfully registered, 'didChangeCustomConfiguration' ignored");
        }
        else {
            console.warn("provider should be registered before sending config change messages");
        }
    }
    didChangeCustomBrowseConfiguration(provider) {
        let providers = customProviders_1.getCustomConfigProviders();
        let p = providers.get(provider);
        if (p) {
            LanguageServer.getClients().forEach(client => client.updateCustomBrowseConfiguration(p));
        }
        else if (this.failedRegistrations.find(p => p === provider)) {
            console.warn("provider not successfully registered, 'didChangeCustomBrowseConfiguration' ignored");
        }
        else {
            console.warn("provider should be registered before sending config change messages");
        }
    }
    dispose() {
        this.providers.forEach(provider => {
            customProviders_1.getCustomConfigProviders().remove(provider);
            provider.dispose();
        });
        this.providers = [];
    }
    getTestHook() {
        return test.getTestHook();
    }
}
exports.CppTools = CppTools;
//# sourceMappingURL=cppTools.js.map