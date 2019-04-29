/**
 * Extension startup/teardown
 */ /** */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
require('module-alias/register');
const vscode = require("vscode");
const path = require("path");
const cpt = require("vscode-cpptools");
const logging = require("./logging");
const util = require("./util");
const cpptools_1 = require("@cmt/cpptools");
const cache_1 = require("@cmt/cache");
const cmake_tools_1 = require("./cmake-tools");
const rollbar_1 = require("./rollbar");
const kit_1 = require("@cmt/kit");
const pr_1 = require("@cmt/pr");
const watcher_1 = require("@cmt/watcher");
const config_1 = require("@cmt/config");
const paths_1 = require("@cmt/paths");
const strand_1 = require("@cmt/strand");
const status_1 = require("./status");
const prop_1 = require("@cmt/prop");
const tree_1 = require("@cmt/tree");
const util_1 = require("./util");
const log = logging.createLogger('extension');
function reportProgress(progress, message) {
    if (progress) {
        progress.report({ message });
    }
}
/**
 * A class to manage the extension.
 *
 * Yeah, yeah. It's another "Manager", but this is to be the only one.
 *
 * This is the true "singleton" of the extension. It acts as the glue between
 * the lower layers and the VSCode UX. When a user presses a button to
 * necessitate user input, this class acts as intermediary and will send
 * important information down to the lower layers.
 */
class ExtensionManager {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
        /**
         * Subscription to workspace changes.
         *
         * When a workspace is added or removed, the instances of CMakeTools are
         * update to match the new state.
         *
         * For each workspace folder, a separate instance of CMake Tools is
         * maintained. This allows each folder to both share configuration as well as
         * keep its own separately.
         */
        this._workspaceFoldersChangedSub = vscode.workspace.onDidChangeWorkspaceFolders(e => rollbar_1.default.invokeAsync('Update workspace folders', () => this._onWorkspaceFoldersChanged(e)));
        /**
         * Adding/removing workspaces should be serialized. Keep that work in a strand.
         */
        this._wsModStrand = new strand_1.Strand();
        /**
         * The CMake Tools backend instances available in the extension. The reason
         * for multiple is so that each workspace folder may have its own unique instance
         */
        this._cmakeToolsInstances = new Map();
        /**
         * The status bar controller
         */
        this._statusBar = new status_1.StatusBar();
        // Subscriptions for status bar items:
        this._statusMessageSub = new util_1.DummyDisposable();
        this._targetNameSub = new util_1.DummyDisposable();
        this._buildTypeSub = new util_1.DummyDisposable();
        this._launchTargetSub = new util_1.DummyDisposable();
        this._ctestEnabledSub = new util_1.DummyDisposable();
        this._testResultsSub = new util_1.DummyDisposable();
        this._isBusySub = new util_1.DummyDisposable();
        // Watch the code model so that we may update teh tree view
        this._codeModelSub = new util_1.DummyDisposable();
        /**
         * The tree data provider
         */
        this._projectOutlineProvider = new tree_1.ProjectOutlineProvider();
        this._projectOutlineDisposer = vscode.window.registerTreeDataProvider('cmake.outline', this._projectOutlineProvider);
        this._configProvider = new cpptools_1.CppConfigurationProvider();
        /**
         * The active workspace folder. This controls several aspects of the extension,
         * including:
         *
         * - Which CMakeTools backend receives commands from the user
         * - Where we search for variants
         * - Where we search for workspace-local kits
         */
        this._activeWorkspaceFolder = null;
        /**
         * The kits available from the user-local kits file
         */
        this._userKits = [];
        /**
         * The kits available from the workspace kits file
         */
        this._wsKits = [];
        /**
         * Watches for changes to the kits file
         */
        this._kitsWatcher = new watcher_1.MultiWatcher(kit_1.USER_KITS_FILEPATH);
        /**
         * Watch for text edits. At the moment, this only watches for changes to the
         * kits files, since the filesystem watcher in the `_kitsWatcher` is sometimes
         * unreliable.
         */
        this._editorWatcher = vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.uri.fsPath === kit_1.USER_KITS_FILEPATH) {
                rollbar_1.default.takePromise('Re-reading kits on text edit', {}, this._rereadKits());
            }
            else if (this._workspaceKitsPath && doc.uri.fsPath === this._workspaceKitsPath) {
                rollbar_1.default.takePromise('Re-reading kits on text edit', {}, this._rereadKits());
            }
            else {
                // Ignore
            }
        });
    }
    /**
     * Handle workspace change event.
     * @param e Workspace change event
     */
    async _onWorkspaceFoldersChanged(e) {
        // Un-register each CMake Tools we have loaded for each removed workspace
        for (const removed of e.removed) {
            await this._removeWorkspaceFolder(removed);
        }
        // Load a new CMake Tools instance for each folder that has been added.
        for (const added of e.added) {
            await this.addWorkspaceFolder(added);
        }
    }
    /**
     * The CMake Tools instance associated with the current workspace folder, or
     * `null` if no folder is open.
     */
    get _activeCMakeTools() {
        if (this._activeWorkspaceFolder) {
            const ret = this._cmakeToolsForWorkspaceFolder(this._activeWorkspaceFolder);
            if (!ret) {
                rollbar_1.default.error('No active CMake Tools attached to the current workspace. Impossible!');
                return null;
            }
            return ret;
        }
        return null;
    }
    /**
     * Get the CMakeTools instance associated with the given workspace folder, or `null`
     * @param ws The workspace folder to search
     */
    _cmakeToolsForWorkspaceFolder(ws) {
        return this._cmakeToolsInstances.get(ws.name) || null;
    }
    /**
     * Ensure that there is an active kit for the current CMakeTools.
     *
     * @returns `false` if there is not active CMakeTools, or it has no active kit
     * and the user cancelled the kit selection dialog.
     */
    async _ensureActiveKit(cmt = null) {
        if (!cmt) {
            cmt = this._activeCMakeTools;
        }
        if (!cmt) {
            // No CMakeTools. Probably no workspace open.
            return false;
        }
        if (cmt.activeKit) {
            // We have an active kit. We're good.
            return true;
        }
        // No kit? Ask the user what they want.
        const did_choose_kit = await this.selectKit();
        if (!did_choose_kit) {
            // The user did not choose a kit
            return false;
        }
        // Return whether we have an active kit defined.
        return !!cmt.activeKit;
    }
    /**
     * Dispose of the CMake Tools extension.
     *
     * If you can, prefer to call `asyncDispose`, which awaits on the children.
     */
    dispose() { rollbar_1.default.invokeAsync('Dispose of CMake Tools', () => this.asyncDispose()); }
    /**
     * Asynchronously dispose of all the child objects.
     */
    async asyncDispose() {
        this._disposeSubs();
        this._workspaceFoldersChangedSub.dispose();
        this._kitsWatcher.dispose();
        this._editorWatcher.dispose();
        this._projectOutlineDisposer.dispose();
        if (this._cppToolsAPI) {
            this._cppToolsAPI.dispose();
        }
        // Dispose of each CMake Tools we still have loaded
        for (const cmt of this._cmakeToolsInstances.values()) {
            await cmt.asyncDispose();
        }
    }
    async _postWorkspaceOpen(ws, cmt) {
        let should_configure = cmt.workspaceContext.config.configureOnOpen;
        if (should_configure === null && process.env['CMT_TESTING'] !== '1') {
            const chosen = await vscode.window.showInformationMessage('Would you like to configure this project?', {}, { title: 'Yes', doConfigure: true }, { title: 'Not now', doConfigure: false });
            if (!chosen) {
                // Do nothing. User cancelled
                return;
            }
            const perist_message = chosen.doConfigure ? 'Always configure projects upon opening?' : 'Never configure projects on opening?';
            const persist_pr 
            // Try to persist the user's selection to a `settings.json`
            = vscode.window
                .showInformationMessage(perist_message, {}, { title: 'Yes', persistMode: 'user' }, { title: 'For this Workspace', persistMode: 'workspace' })
                .then(async (choice) => {
                if (!choice) {
                    // Use cancelled. Do nothing.
                    return;
                }
                const config = vscode.workspace.getConfiguration(undefined, ws.uri);
                let config_target = vscode.ConfigurationTarget.Global;
                if (choice.persistMode === 'workspace') {
                    config_target = vscode.ConfigurationTarget.WorkspaceFolder;
                }
                await config.update('cmake.configureOnOpen', chosen.doConfigure, config_target);
            });
            rollbar_1.default.takePromise('Persist config-on-open setting', {}, persist_pr);
            should_configure = chosen.doConfigure;
        }
        if (should_configure) {
            // We've opened a new workspace folder, and the user wants us to
            // configure it now.
            log.debug('Configuring workspace on open ', ws.uri);
            // Ensure that there is a kit. This is required for new instances.
            if (!await this._ensureActiveKit(cmt)) {
                return;
            }
            await cmt.configure();
        }
    }
    /**
     * Create a new instance of the backend to support the given workspace folder.
     * The given folder *must not* already be loaded.
     * @param ws The workspace folder to load for
     * @returns The newly created CMakeTools backend for the given folder
     */
    async addWorkspaceFolder(ws, progress) {
        return this._wsModStrand.execute(async () => {
            // Check that we aren't double-loading for this workspace. That would be bad...
            const current_cmt = this._cmakeToolsForWorkspaceFolder(ws);
            if (current_cmt) {
                rollbar_1.default.error('Double-loaded CMake Tools instance for workspace folder', { wsUri: ws.uri.toString() });
                // Not even sure how to best handle this...
                return current_cmt;
            }
            // Load for the workspace.
            reportProgress(progress, 'Creating backend');
            const new_cmt = await this._loadCMakeToolsForWorkspaceFolder(ws);
            // If we didn't have anything active, mark the freshly loaded instance as active
            if (this._activeWorkspaceFolder === null) {
                await this._setActiveWorkspaceFolder(ws, progress);
            }
            rollbar_1.default.takePromise('Post-folder-open', { folder: ws }, this._postWorkspaceOpen(ws, new_cmt));
            // Return the newly created instance
            return new_cmt;
        });
    }
    /**
     * Load a new CMakeTools for the given workspace folder and remember it.
     * @param ws The workspace folder to load for
     */
    async _loadCMakeToolsForWorkspaceFolder(ws) {
        // New instance
        const new_cmt = await this._createCMakeToolsForWorkspaceFolder(ws);
        // Save the instance:
        this._cmakeToolsInstances.set(ws.name, new_cmt);
        return new_cmt;
    }
    /**
     * Create a new CMakeTools instance for the given WorkspaceFolder
     * @param ws The workspace folder to create for
     */
    async _createCMakeToolsForWorkspaceFolder(ws) {
        // Get the kits that will be available for the new workspace directory
        const ws_kits = await kit_1.kitsAvailableInWorkspaceDirectory(ws.uri.fsPath);
        // Create the backend:
        const new_cmt = await cmake_tools_1.default.createForDirectory(ws.uri.fsPath, this.extensionContext);
        // Check if the CMakeTools remembers what kit it was last using in this dir:
        const kit_name = new_cmt.workspaceContext.state.activeKitName;
        if (!kit_name) {
            // No prior kit. Done.
            return new_cmt;
        }
        // It remembers a kit. Find it in the kits avail in this dir:
        const kit = ws_kits.find(k => k.name == kit_name) || null;
        // Set the kit: (May do nothing if no kit was found)
        await new_cmt.setKit(kit);
        // Done.
        return new_cmt;
    }
    /**
     * Remove knowledge of the given workspace folder. Disposes of the CMakeTools
     * instance associated with the workspace.
     * @param ws The workspace to remove for
     */
    _removeWorkspaceFolder(ws) {
        // Keep this work in a strand
        return this._wsModStrand.execute(async () => {
            const inst = this._cmakeToolsForWorkspaceFolder(ws);
            if (!inst) {
                // CMake Tools should always be aware of all workspace folders. If we
                // somehow missed one, that's a bug
                rollbar_1.default.error('Workspace folder removed, but not associated with an extension instance', { wsName: ws.name });
                // Keep the UI running, just don't remove this instance.
                return;
            }
            // If the removed workspace is the active one, reset the active instance.
            if (inst === this._activeCMakeTools) {
                // Forget about the workspace
                await this._setActiveWorkspaceFolder(null);
            }
            // Drop the instance from our table. Forget about it.
            this._cmakeToolsInstances.delete(ws.name);
            // Finally, dispose of the CMake Tools now that the workspace is gone.
            await inst.asyncDispose();
        });
    }
    /**
     * Set the active workspace folder. This reloads a lot of different bits and
     * pieces to control which backend has control and receives user input.
     * @param ws The workspace to activate
     */
    async _setActiveWorkspaceFolder(ws, progress) {
        reportProgress(progress, `Loading workspace folder ${ws ? ws.name : ''}`);
        // Keep it in the strand
        // We SHOULD have a CMakeTools instance loaded for this workspace.
        // It should have been added by `addWorkspaceFolder`
        if (ws && !this._cmakeToolsInstances.has(ws.name)) {
            rollbar_1.default.error('No CMake Tools instance ready for the active workspace. Impossible!', { wsUri: ws.uri.toString() });
            return;
        }
        // Set the new workspace
        this._activeWorkspaceFolder = ws;
        // Drop the old kit watcher on the floor
        this._resetKitsWatcher();
        // Re-read kits for the new workspace:
        await this._rereadKits(progress);
        this._setupSubscriptions();
    }
    _disposeSubs() {
        for (const sub of [this._statusMessageSub,
            this._targetNameSub,
            this._buildTypeSub,
            this._launchTargetSub,
            this._ctestEnabledSub,
            this._testResultsSub,
            this._isBusySub,
            this._codeModelSub,
        ]) {
            sub.dispose();
        }
    }
    _updateCodeModel(cmt) {
        this._projectOutlineProvider.updateCodeModel(cmt.codeModel, {
            defaultTargetName: cmt.defaultBuildTarget || 'all',
            launchTargetName: cmt.launchTargetName,
        });
        rollbar_1.default.invokeAsync('Update code model for cpptools', {}, async () => {
            if (!this._cppToolsAPI) {
                this._cppToolsAPI = await cpt.getCppToolsApi(cpt.Version.v2);
            }
            if (this._cppToolsAPI && cmt.codeModel && cmt.activeKit) {
                const codeModel = cmt.codeModel;
                const kit = cmt.activeKit;
                const cpptools = this._cppToolsAPI;
                let cache;
                try {
                    cache = await cache_1.CMakeCache.fromPath(await cmt.cachePath);
                }
                catch (e) {
                    rollbar_1.default.exception('Failed to open CMake cache file on code model update', e);
                    return;
                }
                const env = await kit_1.effectiveKitEnvironment(kit);
                const clCompilerPath = await kit_1.findCLCompilerPath(env);
                this._configProvider.updateConfigurationData({ cache, codeModel, clCompilerPath });
                await this.ensureCppToolsProviderRegistered();
                if (cpptools.notifyReady) {
                    cpptools.notifyReady(this._configProvider);
                }
                else {
                    cpptools.didChangeCustomConfiguration(this._configProvider);
                }
            }
        });
    }
    _setupSubscriptions() {
        this._disposeSubs();
        const cmt = this._activeCMakeTools;
        this._statusBar.setVisible(true);
        if (!cmt) {
            this._statusMessageSub = new util_1.DummyDisposable();
            this._targetNameSub = new util_1.DummyDisposable();
            this._buildTypeSub = new util_1.DummyDisposable();
            this._launchTargetSub = new util_1.DummyDisposable();
            this._ctestEnabledSub = new util_1.DummyDisposable();
            this._testResultsSub = new util_1.DummyDisposable();
            this._isBusySub = new util_1.DummyDisposable();
            this._statusBar.setActiveKitName('');
            this._codeModelSub = new util_1.DummyDisposable();
        }
        else {
            this._statusMessageSub = cmt.onStatusMessageChanged(prop_1.FireNow, s => this._statusBar.setStatusMessage(s));
            this._targetNameSub = cmt.onTargetNameChanged(prop_1.FireNow, t => {
                this._statusBar.targetName = t;
                this._updateCodeModel(cmt);
            });
            this._buildTypeSub = cmt.onBuildTypeChanged(prop_1.FireNow, bt => this._statusBar.setBuildTypeLabel(bt));
            this._launchTargetSub = cmt.onLaunchTargetNameChanged(prop_1.FireNow, t => {
                this._statusBar.setLaunchTargetName(t || '');
                this._updateCodeModel(cmt);
            });
            this._ctestEnabledSub = cmt.onCTestEnabledChanged(prop_1.FireNow, e => this._statusBar.ctestEnabled = e);
            this._testResultsSub = cmt.onTestResultsChanged(prop_1.FireNow, r => this._statusBar.testResults = r);
            this._isBusySub = cmt.onIsBusyChanged(prop_1.FireNow, b => this._statusBar.setIsBusy(b));
            this._statusBar.setActiveKitName(cmt.activeKit ? cmt.activeKit.name : '');
            this._codeModelSub = cmt.onCodeModelChanged(prop_1.FireNow, () => this._updateCodeModel(cmt));
        }
    }
    /**
     * Drop the current kits watcher and create a new one.
     */
    _resetKitsWatcher() {
        // Throw the old one away
        this._kitsWatcher.dispose();
        // Determine whether we need to watch the workspace kits file:
        const ws_kits_path = this._workspaceKitsPath;
        this._kitsWatcher = ws_kits_path
            // We have workspace kits:
            ? new watcher_1.MultiWatcher(kit_1.USER_KITS_FILEPATH, ws_kits_path)
            // No workspace:
            : new watcher_1.MultiWatcher(kit_1.USER_KITS_FILEPATH);
        // Subscribe to its events:
        this._kitsWatcher.onAnyEvent(_ => rollbar_1.default.invokeAsync('Re-reading kits', () => this._rereadKits()));
    }
    /**
     * The path to the workspace-local kits file, dependent on the path to the
     * active workspace folder.
     */
    get _workspaceKitsPath() {
        return this._activeWorkspaceFolder
            // Path present:
            ? kit_1.kitsPathForWorkspaceFolder(this._activeWorkspaceFolder)
            // No open folder:
            : null;
    }
    /**
     * Get both workspace-local kits and user-local kits
     */
    get _allKits() { return this._userKits.concat(this._wsKits); }
    /**
     * Reload the list of available kits from the filesystem. This will also
     * update the kit loaded into the current backend if applicable.
     */
    async _rereadKits(progress) {
        // Migrate kits from old pre-1.1.3 location
        try {
            if (await pr_1.fs.exists(kit_1.OLD_USER_KITS_FILEPATH) && !await pr_1.fs.exists(kit_1.USER_KITS_FILEPATH)) {
                rollbar_1.default.info('Migrating kits file', { from: kit_1.OLD_USER_KITS_FILEPATH, to: kit_1.USER_KITS_FILEPATH });
                await pr_1.fs.mkdir_p(path.dirname(kit_1.USER_KITS_FILEPATH));
                await pr_1.fs.rename(kit_1.OLD_USER_KITS_FILEPATH, kit_1.USER_KITS_FILEPATH);
            }
        }
        catch (e) {
            rollbar_1.default.exception('Failed to migrate prior user-local kits file.', e, { from: kit_1.OLD_USER_KITS_FILEPATH, to: kit_1.USER_KITS_FILEPATH });
        }
        // Load user-kits
        reportProgress(progress, 'Loading kits');
        const user = await kit_1.readKitsFile(kit_1.USER_KITS_FILEPATH);
        // Conditionally load workspace kits
        let workspace = [];
        if (this._workspaceKitsPath) {
            workspace = await kit_1.readKitsFile(this._workspaceKitsPath);
        }
        // Add the special __unspec__ kit for opting-out of kits
        user.push({ name: '__unspec__' });
        // Set them as known. May reload the current kit.s
        await this._setKnownKits({ user, workspace });
        // Pruning requires user interaction, so it happens fully async
        this._startPruneOutdatedKitsAsync();
    }
    /**
     * Set the kits that are available to the user. May change the active kit.
     * @param opts `user` for user local kits, `workspace` for workspace-local kits
     */
    async _setKnownKits(opts) {
        this._userKits = opts.user;
        this._wsKits = opts.workspace;
        const cmt = this._activeCMakeTools;
        if (cmt) {
            const current = cmt.activeKit;
            if (current) {
                const already_active_kit = this._allKits.find(kit => kit.name === current.name);
                // Set the current kit to the one we have named
                await this._setCurrentKit(already_active_kit || null);
            }
        }
    }
    /**
     * Set the current kit in the current CMake Tools instance
     * @param k The kit
     */
    async _setCurrentKit(k) {
        const inst = this._activeCMakeTools;
        const raw_name = k ? k.name : '';
        if (inst) {
            // Generate a message that we will show in the progress notification
            let message = '';
            switch (raw_name) {
                case '':
                case '__unspec__':
                    // Empty string/unspec is un-setting the kit:
                    message = 'Unsetting kit';
                    break;
                default:
                    // Everything else is just loading a kit:
                    message = `Loading kit ${raw_name}`;
                    break;
            }
            rollbar_1.default.updatePayload({ kit: k });
            // Load the kit into the backend
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: message,
            }, () => inst.setKit(k));
        }
        // Update the status bar
        this._statusBar.setActiveKitName(raw_name);
    }
    /**
     * Opens a text editor with the user-local `cmake-kits.json` file.
     */
    async editKits() {
        log.debug('Opening TextEditor for', kit_1.USER_KITS_FILEPATH);
        if (!await pr_1.fs.exists(kit_1.USER_KITS_FILEPATH)) {
            const chosen = await vscode.window.showInformationMessage('No kits file is present. What would you like to do?', { modal: true }, {
                title: 'Scan for kits',
                action: 'scan',
            }, {
                title: 'Cancel',
                isCloseAffordance: true,
                action: 'cancel',
            });
            if (!chosen || chosen.action === 'cancel') {
                return null;
            }
            else {
                await this.scanForKits();
                return this.editKits();
            }
        }
        const doc = await vscode.workspace.openTextDocument(kit_1.USER_KITS_FILEPATH);
        return vscode.window.showTextDocument(doc);
    }
    /**
     * Rescan the system for kits and save them to the user-local kits file
     */
    async scanForKits() {
        log.debug('Rescanning for kits');
        // Convert the kits into a by-name mapping so that we can restore the ones
        // we know about after the fact.
        // We only save the user-local kits: We don't want to save workspace kits
        // in the user kits file.
        const old_kits_by_name = this._userKits.reduce((acc, kit) => (Object.assign({}, acc, { [kit.name]: kit })), {});
        // Do the scan:
        const discovered_kits = await kit_1.scanForKits({ minGWSearchDirs: this._getMinGWDirs() });
        // Update the new kits we know about.
        const new_kits_by_name = discovered_kits.reduce((acc, kit) => (Object.assign({}, acc, { [kit.name]: kit })), old_kits_by_name);
        const new_kits = Object.keys(new_kits_by_name).map(k => new_kits_by_name[k]);
        await this._setKnownKits({ user: new_kits, workspace: this._wsKits });
        await this._writeUserKitsFile(new_kits);
        this._startPruneOutdatedKitsAsync();
    }
    /**
     * Get the current MinGW search directories
     */
    _getMinGWDirs() {
        const cmt = this._activeCMakeTools;
        if (!cmt) {
            // No CMake Tools, but can guess what settings we want.
            const config = config_1.ConfigurationReader.loadForPath(process.cwd());
            return config.mingwSearchDirs;
        }
        else {
            return cmt.workspaceContext.config.mingwSearchDirs;
        }
    }
    /**
     * Write the given kits the the user-local cmake-kits.json file.
     * @param kits The kits to write to the file.
     */
    async _writeUserKitsFile(kits) {
        log.debug('Saving kits to', kit_1.USER_KITS_FILEPATH);
        // Remove the special __unspec__ kit
        const stripped_kits = kits.filter(k => k.name !== '__unspec__');
        // Sort the kits by name so they always appear in order in the file.
        const sorted_kits = stripped_kits.sort((a, b) => {
            if (a.name == b.name) {
                return 0;
            }
            else if (a.name < b.name) {
                return -1;
            }
            else {
                return 1;
            }
        });
        // Do the save.
        try {
            log.debug('Saving new kits to', kit_1.USER_KITS_FILEPATH);
            // Create the directory where the kits will go
            await pr_1.fs.mkdir_p(path.dirname(kit_1.USER_KITS_FILEPATH));
            // Write the file
            await pr_1.fs.writeFile(kit_1.USER_KITS_FILEPATH, JSON.stringify(sorted_kits, null, 2));
        }
        catch (e) {
            const pr = vscode.window
                .showErrorMessage(`Failed to write kits file to disk: ${kit_1.USER_KITS_FILEPATH}: ${e.toString()}`, {
                title: 'Retry',
                do: 'retry',
            }, {
                title: 'Cancel',
                do: 'cancel',
            })
                .then(choice => {
                if (!choice) {
                    return false;
                }
                switch (choice.do) {
                    case 'retry':
                        return this.scanForKits();
                    case 'cancel':
                        return false;
                }
            });
            // Don't block on writing re-trying the write
            rollbar_1.default.takePromise('retry-kit-save-fail', {}, pr);
            return false;
        }
    }
    /**
     * User-interactive kit pruning:
     *
     * This function will find all user-local kits that identify files that are
     * no longer present (such as compiler binaries), and will show a popup
     * notification to the user requesting an action.
     *
     * This function will not prune kits that have the `keep` field marked `true`
     *
     * If the user chooses to remove the kit, we call `_removeKit()` and erase it
     * from the user-local file.
     *
     * If the user chooses to keep teh kit, we call `_keepKit()` and set the
     * `keep` field on the kit to `true`.
     *
     * Always returns immediately.
     */
    _startPruneOutdatedKitsAsync() {
        // Iterate over _user_ kits. We don't care about workspace-local kits
        for (const kit of this._userKits) {
            if (kit.keep === true) {
                // Kit is explicitly marked to be kept
                continue;
            }
            if (!kit.compilers) {
                // We only prune kits with a `compilers` field.
                continue;
            }
            const missing_paths_prs = [];
            for (const lang in kit.compilers) {
                const comp_path = kit.compilers[lang];
                // Get a promise that resolve to whether the given path/name exists
                const exists_pr = path.isAbsolute(comp_path)
                    // Absolute path, just check if it exists
                    ? pr_1.fs.exists(comp_path)
                    // Non-absolute. Check on $PATH
                    : paths_1.default.which(comp_path).then(v => v !== null);
                // Add it to the list
                missing_paths_prs.push(exists_pr.then(exists => ({ exists, path: comp_path })));
            }
            const pr = Promise.all(missing_paths_prs).then(async (infos) => {
                const missing = infos.find(i => !i.exists);
                if (!missing) {
                    return;
                }
                const chosen = await vscode.window.showInformationMessage(`The kit "${kit.name}" references a non-existent compiler binary [${missing.path}]. ` +
                    `What would you like to do?`, {}, {
                    action: 'remove',
                    title: 'Remove it',
                }, {
                    action: 'keep',
                    title: 'Keep it',
                });
                if (chosen === undefined) {
                    return;
                }
                switch (chosen.action) {
                    case 'keep':
                        return this._keepKit(kit);
                    case 'remove':
                        return this._removeKit(kit);
                }
            });
            rollbar_1.default.takePromise(`Pruning kit`, { kit }, pr);
        }
    }
    /**
     * Mark a kit to be "kept". This set the `keep` value to `true` and writes
     * re-writes the user kits file.
     * @param kit The kit to mark
     */
    async _keepKit(kit) {
        const new_kits = this._userKits.map(k => {
            if (k.name === kit.name) {
                return Object.assign({}, k, { keep: true });
            }
            else {
                return k;
            }
        });
        await this._setKnownKits({ user: new_kits, workspace: this._wsKits });
        return this._writeUserKitsFile(new_kits);
    }
    /**
     * Remove a kit from the user-local kits.
     * @param kit The kit to remove
     */
    async _removeKit(kit) {
        const new_kits = this._userKits.filter(k => k.name !== kit.name);
        await this._setKnownKits({ user: new_kits, workspace: this._wsKits });
        return this._writeUserKitsFile(new_kits);
    }
    async _checkHaveKits() {
        if (this._allKits.length > 1) {
            // We have kits. Okay.
            return 'ok';
        }
        if (this._allKits[0].name !== '__unspec__') {
            // We should _always_ have an __unspec__ kit.
            rollbar_1.default.error('Invalid only kit. Expected to find `__unspec__`');
            return 'ok';
        }
        const choices = [
            {
                title: 'Scan for kits',
                action: 'scan',
            },
            {
                title: 'Do not use a kit',
                action: 'use-unspec',
            },
            {
                title: 'Close',
                isCloseAffordance: true,
                action: 'cancel',
            }
        ];
        const chosen = await vscode.window.showInformationMessage('No CMake kits are available. What would you like to do?', { modal: true }, ...choices);
        if (!chosen) {
            // User closed the dialog
            return 'cancel';
        }
        switch (chosen.action) {
            case 'scan': {
                await this.scanForKits();
                return 'ok';
            }
            case 'use-unspec': {
                await this._setCurrentKit({ name: '__unspec__' });
                return 'use-unspec';
            }
            case 'cancel': {
                return 'cancel';
            }
        }
    }
    /**
     * Show UI to allow the user to select an active kit
     */
    async selectKit() {
        log.debug('Start selection of kits. Found', this._allKits.length, 'kits.');
        // Check that we have kits, or if the user doesn't want to use a kit.
        const state = await this._checkHaveKits();
        switch (state) {
            case 'cancel':
                // The user doesn't want to perform any special action
                return false;
            case 'use-unspec':
                // The user chose to use the __unspec__ kit
                return true;
            case 'ok':
                // 'ok' means we have kits defined and should do regular kit selection
                break;
        }
        log.debug('Opening kit selection QuickPick');
        // Generate the quickpick items from our known kits
        const items = this._allKits.map((kit) => ({
            label: kit.name !== '__unspec__' ? kit.name : '[Unspecified]',
            description: kit_1.descriptionForKit(kit),
            kit,
        }));
        const chosen_kit = await vscode.window.showQuickPick(items, { placeHolder: 'Select a Kit' });
        if (chosen_kit === undefined) {
            log.debug('User cancelled Kit selection');
            // No selection was made
            return false;
        }
        else {
            log.debug('User selected kit ', JSON.stringify(chosen_kit));
            await this._setCurrentKit(chosen_kit.kit);
            return true;
        }
    }
    /**
     * Wraps an operation that requires an open workspace and kit selection. If
     * there is no active CMakeTools (no open workspace) or if the user cancels
     * kit selection, we return the given default value.
     * @param default_ The default return value
     * @param fn The callback
     */
    async withCMakeTools(default_, fn) {
        // Check that we have an active CMakeTools instance.
        const cmt = this._activeCMakeTools;
        if (!cmt) {
            vscode.window.showErrorMessage('CMake Tools is not available without an open workspace');
            return Promise.resolve(default_);
        }
        // Ensure that we have a kit available.
        if (!await this._ensureActiveKit()) {
            return Promise.resolve(default_);
        }
        // We have a kit, and we have a CMakeTools. Call the function
        return Promise.resolve(fn(cmt));
    }
    async ensureCppToolsProviderRegistered() {
        if (!this._configProviderRegister) {
            this._configProviderRegister = this._doRegisterCppTools();
        }
        return this._configProviderRegister;
    }
    async _doRegisterCppTools() {
        if (!this._cppToolsAPI) {
            return;
        }
        this._cppToolsAPI.registerCustomConfigurationProvider(this._configProvider);
    }
    // The below functions are all wrappers around the backend.
    cleanConfigure() { return this.withCMakeTools(-1, cmt => cmt.cleanConfigure()); }
    configure() { return this.withCMakeTools(-1, cmt => cmt.configure()); }
    build(name) { return this.withCMakeTools(-1, cmt => cmt.build(name)); }
    setVariant() { return this.withCMakeTools(false, cmt => cmt.setVariant()); }
    install() { return this.withCMakeTools(-1, cmt => cmt.install()); }
    editCache() { return this.withCMakeTools(undefined, cmt => cmt.editCache()); }
    clean() { return this.withCMakeTools(-1, cmt => cmt.clean()); }
    cleanRebuild() { return this.withCMakeTools(-1, cmt => cmt.cleanRebuild()); }
    buildWithTarget() { return this.withCMakeTools(-1, cmt => cmt.buildWithTarget()); }
    /**
     * Compile a single source file.
     * @param file The file to compile. Either a file path or the URI to the file.
     * If not provided, compiles the file in the active text editor.
     */
    async compileFile(file) {
        if (file instanceof vscode.Uri) {
            file = file.fsPath;
        }
        if (!file) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return null;
            }
            file = editor.document.uri.fsPath;
        }
        for (const cmt of this._cmakeToolsInstances.values()) {
            const term = await cmt.tryCompileFile(file);
            if (term) {
                return term;
            }
        }
        vscode.window.showErrorMessage('Unable to find compilation information for this file');
    }
    setDefaultTarget(name) { return this.withCMakeTools(undefined, cmt => cmt.setDefaultTarget(name)); }
    ctest() { return this.withCMakeTools(-1, cmt => cmt.ctest()); }
    stop() { return this.withCMakeTools(false, cmt => cmt.stop()); }
    quickStart() { return this.withCMakeTools(-1, cmt => cmt.quickStart()); }
    launchTargetPath() { return this.withCMakeTools(null, cmt => cmt.launchTargetPath()); }
    debugTarget(name) { return this.withCMakeTools(null, cmt => cmt.debugTarget(name)); }
    launchTarget(name) { return this.withCMakeTools(null, cmt => cmt.launchTarget(name)); }
    selectLaunchTarget(name) { return this.withCMakeTools(null, cmt => cmt.selectLaunchTarget(name)); }
    resetState() { return this.withCMakeTools(null, cmt => cmt.resetState()); }
    viewLog() { return this.withCMakeTools(null, cmt => cmt.viewLog()); }
}
/**
 * The global extension manager. There is only one of these, even if multiple
 * backends.
 */
let _EXT_MANAGER = null;
async function setup(context, progress) {
    reportProgress(progress, 'Initial setup');
    await util.setContextValue('cmakeToolsActive', true);
    // Load a new extension manager
    const ext = _EXT_MANAGER = new ExtensionManager(context);
    // Add all open workspace folders to the manager.
    for (const wsf of vscode.workspace.workspaceFolders || []) {
        reportProgress(progress, `Loading workspace folder ${wsf.name}`);
        await ext.addWorkspaceFolder(wsf, progress);
    }
    // A register function that helps us bind the commands to the extension
    function register(name) {
        return vscode.commands.registerCommand(`cmake.${name}`, (...args) => {
            // Generate a unqiue ID that can be correlated in the log file.
            const id = util.randint(1000, 10000);
            // Create a promise that resolves with the command.
            const pr = (async () => {
                // Debug when the commands start/stop
                log.debug(`[${id}]`, `cmake.${name}`, 'started');
                // Bind the method
                const fn = ext[name].bind(ext);
                // Call the method
                const ret = await fn(...args);
                try {
                    // Log the result of the command.
                    log.debug(`[${id}] cmake.${name} finished (returned ${JSON.stringify(ret)})`);
                }
                catch (e) {
                    // Log, but don't try to serialize the return value.
                    log.debug(`[${id}] cmake.${name} finished (returned an unserializable value)`);
                }
                // Return the result of the command.
                return ret;
            })();
            // Hand the promise to rollbar.
            rollbar_1.default.takePromise(name, {}, pr);
            // Return the promise so that callers will get the result of the command.
            return pr;
        });
    }
    // List of functions that will be bound commands
    const funs = [
        'editKits', 'scanForKits', 'selectKit', 'cleanConfigure', 'configure',
        'build', 'setVariant', 'install', 'editCache', 'clean',
        'cleanRebuild', 'buildWithTarget', 'setDefaultTarget', 'ctest', 'stop',
        'quickStart', 'launchTargetPath', 'debugTarget', 'launchTarget', 'selectLaunchTarget',
        'resetState', 'viewLog', 'compileFile',
    ];
    // Register the functions before the extension is done loading so that fast
    // fingers won't cause "unregistered command" errors while CMake Tools starts
    // up. The command wrapper will await on the extension promise.
    reportProgress(progress, 'Loading extension commands');
    for (const key of funs) {
        log.trace(`Register CMakeTools extension command cmake.${key}`);
        context.subscriptions.push(register(key));
    }
    // Util for the special commands to forward to real commands
    function runCommand(key, ...args) {
        return vscode.commands.executeCommand(`cmake.${key}`, ...args);
    }
    context.subscriptions.push(...[
        // Special commands that don't require logging or separate error handling
        vscode.commands.registerCommand('cmake.outline.configure', () => runCommand('configure')),
        vscode.commands.registerCommand('cmake.outline.build', () => runCommand('build')),
        vscode.commands.registerCommand('cmake.outline.stop', () => runCommand('stop')),
        vscode.commands.registerCommand('cmake.outline.clean', () => runCommand('clean')),
        vscode.commands.registerCommand('cmake.outline.cleanConfigure', () => runCommand('cleanConfigure')),
        vscode.commands.registerCommand('cmake.outline.cleanRebuild', () => runCommand('cleanRebuild')),
        // Commands for outline items:
        vscode.commands.registerCommand('cmake.outline.buildTarget', (what) => runCommand('build', what.name)),
        vscode.commands.registerCommand('cmake.outline.runUtilityTarget', (what) => runCommand('cleanRebuild', what.name)),
        vscode.commands.registerCommand('cmake.outline.debugTarget', (what) => runCommand('debugTarget', what.name)),
        vscode.commands.registerCommand('cmake.outline.launchTarget', (what) => runCommand('launchTarget', what.name)),
        vscode.commands.registerCommand('cmake.outline.setDefaultTarget', (what) => runCommand('setDefaultTarget', what.name)),
        vscode.commands.registerCommand('cmake.outline.setLaunchTarget', (what) => runCommand('selectLaunchTarget', what.name)),
        vscode.commands.registerCommand('cmake.outline.revealInCMakeLists', (what) => what.openInCMakeLists()),
        vscode.commands.registerCommand('cmake.outline.compileFile', (what) => runCommand('compileFile', what.filePath)),
    ]);
}
/**
 * Starts up the extension.
 * @param context The extension context
 * @returns A promise that will resolve when the extension is ready for use
 */
async function activate(context) {
    const packageJSON = util.thisExtensionPackage();
    rollbar_1.default.updatePayload({
        environment: 'production',
        packageJSON,
        client: {
            code_version: packageJSON.version,
        },
        platform: process.platform,
    });
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'CMake Tools initializing...',
        cancellable: false,
    }, progress => setup(context, progress));
    // TODO: Return the extension API
    // context.subscriptions.push(vscode.commands.registerCommand('cmake._extensionInstance', () => cmt));
}
exports.activate = activate;
// this method is called when your extension is deactivated
async function deactivate() {
    log.debug('Deactivate CMakeTools');
    if (_EXT_MANAGER) {
        await _EXT_MANAGER.asyncDispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map