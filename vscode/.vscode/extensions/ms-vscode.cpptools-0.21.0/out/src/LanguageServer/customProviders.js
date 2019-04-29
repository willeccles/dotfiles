'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_cpptools_1 = require("vscode-cpptools");
const settings_1 = require("./settings");
class CustomProviderWrapper {
    constructor(provider, version) {
        this._isReady = version < vscode_cpptools_1.Version.v2;
        this.provider = provider;
        if (provider.extensionId && version === vscode_cpptools_1.Version.v0) {
            version = vscode_cpptools_1.Version.v1;
        }
        this._version = version;
    }
    get isReady() {
        return this._isReady;
    }
    set isReady(ready) {
        this._isReady = ready;
    }
    get isValid() {
        let valid = !!(this.provider.name && this.provider.canProvideConfiguration && this.provider.provideConfigurations);
        if (valid && this._version > vscode_cpptools_1.Version.v0) {
            valid = !!(this.provider.extensionId && this.provider.dispose);
        }
        if (valid && this._version > vscode_cpptools_1.Version.v1) {
            valid = !!(this.provider.canProvideBrowseConfiguration && this.provider.provideBrowseConfiguration);
        }
        return valid;
    }
    get version() {
        return this._version;
    }
    get name() {
        return this.provider.name;
    }
    get extensionId() {
        return this._version === vscode_cpptools_1.Version.v0 ? this.provider.name : this.provider.extensionId;
    }
    canProvideConfiguration(uri, token) {
        return this.provider.canProvideConfiguration(uri, token);
    }
    provideConfigurations(uris, token) {
        return this.provider.provideConfigurations(uris, token);
    }
    canProvideBrowseConfiguration(token) {
        return this._version < vscode_cpptools_1.Version.v2 ? Promise.resolve(false) : this.provider.canProvideBrowseConfiguration(token);
    }
    provideBrowseConfiguration(token) {
        console.assert(this._version >= vscode_cpptools_1.Version.v2);
        return this._version < vscode_cpptools_1.Version.v2 ? Promise.resolve({ browsePath: [] }) : this.provider.provideBrowseConfiguration(token);
    }
    dispose() {
        if (this._version !== vscode_cpptools_1.Version.v0) {
            this.provider.dispose();
        }
    }
}
class CustomConfigurationProviderCollection {
    constructor() {
        this.providers = new Map();
    }
    logProblems(provider, version) {
        let missing = [];
        if (!provider.name) {
            missing.push("'name'");
        }
        if (version !== vscode_cpptools_1.Version.v0 && !provider.extensionId) {
            missing.push("'extensionId'");
        }
        if (!provider.canProvideConfiguration) {
            missing.push("'canProvideConfiguration'");
        }
        if (!provider.provideConfigurations) {
            missing.push("'canProvideConfiguration'");
        }
        if (version !== vscode_cpptools_1.Version.v0 && !provider.dispose) {
            missing.push("'dispose'");
        }
        if (version >= vscode_cpptools_1.Version.v2 && !provider.canProvideBrowseConfiguration) {
            missing.push("'canProvideBrowseConfiguration'");
        }
        if (version >= vscode_cpptools_1.Version.v2 && !provider.provideBrowseConfiguration) {
            missing.push("'provideBrowseConfiguration'");
        }
        console.error(`CustomConfigurationProvider was not registered. The following properties are missing from the implementation: ${missing.join(", ")}.`);
    }
    getId(provider) {
        if (typeof provider === "string") {
            return provider;
        }
        else if (provider.extensionId) {
            return provider.extensionId;
        }
        else if (provider.name) {
            return provider.name;
        }
        else {
            console.error(`invalid provider: ${provider}`);
            return "";
        }
    }
    get size() {
        return this.providers.size;
    }
    add(provider, version) {
        if (new settings_1.CppSettings().intelliSenseEngine === "Disabled") {
            console.warn("IntelliSense is disabled. Provider will not be registered.");
            return false;
        }
        let wrapper = new CustomProviderWrapper(provider, version);
        if (!wrapper.isValid) {
            this.logProblems(provider, version);
            return false;
        }
        let exists = this.providers.has(wrapper.extensionId);
        if (exists) {
            let existing = this.providers.get(wrapper.extensionId);
            exists = (existing.version === vscode_cpptools_1.Version.v0 && wrapper.version === vscode_cpptools_1.Version.v0);
        }
        if (!exists) {
            this.providers.set(wrapper.extensionId, wrapper);
        }
        else {
            console.error(`CustomConfigurationProvider '${wrapper.extensionId}' has already been registered.`);
        }
        return !exists;
    }
    get(provider) {
        let id = this.getId(provider);
        if (this.providers.has(id)) {
            return this.providers.get(id);
        }
        return null;
    }
    forEach(func) {
        this.providers.forEach(provider => func(provider));
    }
    remove(provider) {
        let id = this.getId(provider);
        if (this.providers.has(id)) {
            this.providers.delete(id);
        }
        else {
            console.warn(`${id} is not registered`);
        }
    }
    checkId(providerId) {
        if (!providerId) {
            return providerId;
        }
        let found = [];
        let noUpdate = false;
        this.forEach(provider => {
            if (provider.extensionId === providerId) {
                noUpdate = true;
            }
            else if (provider.name === providerId && provider.version !== vscode_cpptools_1.Version.v0) {
                found.push(provider);
            }
        });
        if (noUpdate) {
            return providerId;
        }
        if (found.length === 1) {
            return found[0].extensionId;
        }
        else if (found.length > 1) {
            console.warn("duplicate provider name found. Not upgrading.");
        }
        return providerId;
    }
}
exports.CustomConfigurationProviderCollection = CustomConfigurationProviderCollection;
let providerCollection = new CustomConfigurationProviderCollection();
function getCustomConfigProviders() {
    return providerCollection;
}
exports.getCustomConfigProviders = getCustomConfigProviders;
//# sourceMappingURL=customProviders.js.map