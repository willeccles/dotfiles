"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = require("js-yaml");
const json5 = require("json5");
const path = require("path");
const vscode = require("vscode");
const logging = require("./logging");
const pr_1 = require("./pr");
const rollbar_1 = require("./rollbar");
const schema_1 = require("./schema");
const util = require("./util");
const watcher_1 = require("./watcher");
const log = logging.createLogger('variant');
function processVariantFileData(root) {
    const settings = util.objectPairs(root).map(([setting_name, setting_def]) => {
        const choices = util.objectPairs(setting_def.choices).map(([opt_key, opt_def]) => {
            return Object.assign({}, opt_def, { key: opt_key });
        });
        return {
            name: setting_name,
            default: setting_def.default,
            choices,
        };
    });
    return { settings };
}
exports.processVariantFileData = processVariantFileData;
exports.DEFAULT_VARIANTS = {
    buildType: {
        default: 'debug',
        description: 'The build type',
        choices: {
            debug: {
                short: 'Debug',
                long: 'Emit debug information without performing optimizations',
                buildType: 'Debug',
            },
            release: {
                short: 'Release',
                long: 'Enable optimizations, omit debug info',
                buildType: 'Release',
            },
            minsize: {
                short: 'MinSizeRel',
                long: 'Optimize for smallest binary size',
                buildType: 'MinSizeRel',
            },
            reldeb: {
                short: 'RelWithDebInfo',
                long: 'Perform optimizations AND include debugging information',
                buildType: 'RelWithDebInfo',
            }
        }
    }
};
class VariantManager {
    /**
     * Create a new VariantManager
     * @param stateManager The state manager for this instance
     */
    constructor(stateManager, config) {
        this.stateManager = stateManager;
        this.config = config;
        /**
         * The variants available for this project
         */
        this._variants = { settings: [] };
        this._activeVariantChanged = new vscode.EventEmitter();
        /**
         * Watches for changes to the variants file on the filesystem
         */
        this._variantFileWatcher = new watcher_1.MultiWatcher();
        log.debug('Constructing VariantManager');
        if (!vscode.workspace.workspaceFolders) {
            return; // Nothing we can do. We have no directory open
        }
        const folder = vscode.workspace.workspaceFolders[0]; // TODO: Multi-root!
        if (!folder) {
            return; // No root folder open
        }
        const base_path = folder.uri.path;
        for (const filename of ['cmake-variants.yaml',
            'cmake-variants.json',
            '.vscode/cmake-variants.yaml',
            '.vscode/cmake-variants.json']) {
            this._variantFileWatcher.createWatcher(path.join(base_path, filename));
        }
        this._variantFileWatcher.onAnyEvent(e => { rollbar_1.default.invokeAsync(`Reloading variants file ${e.fsPath}`, () => this._reloadVariantsFile(e.fsPath)); });
        config.onChange('defaultVariants', () => {
            rollbar_1.default.invokeAsync(`Reloading variants from settings`, () => this._reloadVariantsFile());
        });
    }
    get onActiveVariantChanged() { return this._activeVariantChanged.event; }
    dispose() {
        this._variantFileWatcher.dispose();
        this._activeVariantChanged.dispose();
    }
    loadVariantsFromSettings() {
        const collectionOfVariantsFromConfig = this.config.defaultVariants;
        if (collectionOfVariantsFromConfig) {
            return collectionOfVariantsFromConfig;
        }
        else {
            return exports.DEFAULT_VARIANTS;
        }
    }
    async _reloadVariantsFile(filepath) {
        const validate = await schema_1.loadSchema('schemas/variants-schema.json');
        const workdir = vscode.workspace.rootPath;
        if (!workdir) {
            // Can't read, we don't have a dir open
            return;
        }
        if (!filepath || !await pr_1.fs.exists(filepath)) {
            const candidates = [
                path.join(workdir, 'cmake-variants.json'),
                path.join(workdir, 'cmake-variants.yaml'),
                path.join(workdir, '.vscode/cmake-variants.json'),
                path.join(workdir, '.vscode/cmake-variants.yaml'),
            ];
            for (const testpath of candidates) {
                if (await pr_1.fs.exists(testpath)) {
                    filepath = testpath;
                    break;
                }
            }
        }
        let new_variants = this.loadVariantsFromSettings();
        // Check once more that we have a file to read
        if (filepath && await pr_1.fs.exists(filepath)) {
            const content = (await pr_1.fs.readFile(filepath)).toString();
            try {
                if (filepath.endsWith('.json')) {
                    new_variants = json5.parse(content);
                }
                else {
                    new_variants = yaml.load(content);
                }
            }
            catch (e) {
                log.error(`Error parsing ${filepath}: ${e}`);
            }
        }
        const is_valid = validate(new_variants);
        if (!is_valid) {
            const errors = validate.errors;
            log.error('Invalid variants specified:');
            for (const err of errors) {
                log.error(` >> ${err.dataPath}: ${err.message}`);
            }
            new_variants = exports.DEFAULT_VARIANTS;
            log.info('Loaded default variants');
        }
        else {
            log.info('Loaded new set of variants');
        }
        this._variants = processVariantFileData(new_variants);
    }
    get haveVariant() { return !!this.stateManager.activeVariantSettings; }
    variantConfigurationOptionsForKWs(keywordSetting) {
        const vars = this._variants;
        let error = undefined;
        const data = Array.from(keywordSetting.entries()).map(([setting_key, opt_key]) => {
            const unknown_choice = { short: 'Unknown', key: '__unknown__' };
            const found_setting = vars.settings.find(s => s.name == setting_key);
            if (!found_setting) {
                error = `Missing setting "${setting_key}" in variant definition.`;
                return unknown_choice;
            }
            const found_choice = found_setting.choices.find(o => o.key == opt_key);
            if (!found_choice) {
                error = `Missing variant choice "${opt_key}" on "${setting_key}" in variant definition.`;
                return unknown_choice;
            }
            return found_choice;
        });
        if (error) {
            return error;
        }
        else {
            return data;
        }
    }
    mergeVariantConfigurations(options) {
        const init = { short: '', long: '', settings: {} };
        return options.reduce((acc, el) => ({
            key: '__merged__',
            buildType: el.buildType || acc.buildType,
            linkage: el.linkage || acc.linkage,
            // TS 2.4 doesn't like using object spread here, for some reason.
            // tslint:disable-next-line:prefer-object-spread
            settings: Object.assign({}, acc.settings, el.settings),
            short: [acc.short, el.short].join(' ').trim(),
            long: [acc.long, el.long].join(', '),
            env: util.mergeEnvironment(acc.env || {}, el.env || {}),
        }), init);
    }
    get activeVariantOptions() {
        const invalid_variant = {
            key: '__invalid__',
            short: 'Unknown',
            long: 'Unknwon',
        };
        const kws = this.stateManager.activeVariantSettings;
        if (!kws) {
            return invalid_variant;
        }
        const vars = this._variants;
        if (!vars) {
            return invalid_variant;
        }
        let options_or_error = this.variantConfigurationOptionsForKWs(kws);
        if (typeof options_or_error === 'string') {
            log.warning('Last variant selection is incompatible with present variant definition.');
            log.warning('>> ' + options_or_error);
            log.warning('Using default variant choices from variant definition.');
            const defaultKws = this.findDefaultChoiceCombination();
            options_or_error = this.variantConfigurationOptionsForKWs(defaultKws);
        }
        if (typeof options_or_error === 'string') {
            // Still invalid?
            return invalid_variant;
        }
        return this.mergeVariantConfigurations(options_or_error);
    }
    async selectVariant() {
        const variants = this._variants.settings.map(setting => setting.choices.map(opt => ({
            settingKey: setting.name,
            settingValue: opt.key,
            settings: opt,
        })));
        const product = util.product(variants);
        const items = product.map(optionset => ({
            label: optionset.map(o => o.settings.short).join(' + '),
            keywordSettings: this.transformChoiceCombinationToKeywordSettings(optionset),
            description: optionset.map(o => o.settings.long).join(' + '),
        }));
        const chosen = await vscode.window.showQuickPick(items);
        if (!chosen) {
            return false;
        }
        this.publishActiveKeywordSettings(chosen.keywordSettings);
        return true;
    }
    publishActiveKeywordSettings(keywordSettings) {
        this.stateManager.activeVariantSettings = keywordSettings;
        this._activeVariantChanged.fire();
    }
    transformChoiceCombinationToKeywordSettings(choiceCombination) {
        const keywords = new Map();
        choiceCombination.forEach(kv => keywords.set(kv.settingKey, kv.settingValue));
        return keywords;
    }
    findDefaultChoiceCombination() {
        const defaults = this._variants.settings.map(setting => ({
            settingKey: setting.name,
            settingValue: setting.default,
        }));
        return this.transformChoiceCombinationToKeywordSettings(Array.from(defaults));
    }
    async initialize() {
        await this._reloadVariantsFile();
        if (this.stateManager.activeVariantSettings === null) {
            const defaultChoices = this.findDefaultChoiceCombination();
            this.publishActiveKeywordSettings(defaultChoices);
        }
    }
}
exports.VariantManager = VariantManager;
//# sourceMappingURL=variant.js.map