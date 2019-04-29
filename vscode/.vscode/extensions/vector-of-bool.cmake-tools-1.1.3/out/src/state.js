"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This class keeps track of all state that needs to persist between sessions
 * within a single workspace. Objects that wish to persist state should store
 * it here to ensure that we keep state consistent.
 *
 * This uses VSCode's Memento objects to ensure consistency. The user cannot
 * easily modify the contents of a Memento, so we can be sure that the contents
 * won't be torn or invalid, unless we make them that way. This class prevents
 * invalid states.
 */
class StateManager {
    constructor(extensionContext) {
        this.extensionContext = extensionContext;
    }
    /**
     * The name of the workspace-local active kit.
     */
    get activeKitName() {
        const kit = this.extensionContext.workspaceState.get('activeKitName');
        return kit || null;
    }
    set activeKitName(v) { this.extensionContext.workspaceState.update('activeKitName', v); }
    /**
     * The currently select build target
     */
    get defaultBuildTarget() {
        const target = this.extensionContext.workspaceState.get('activeBuildTarget');
        return target || null;
    }
    set defaultBuildTarget(s) { this.extensionContext.workspaceState.update('activeBuildTarget', s); }
    get launchTargetName() {
        const name = this.extensionContext.workspaceState.get('launchTargetName');
        return name || null;
    }
    set launchTargetName(t) { this.extensionContext.workspaceState.update('launchTargetName', t); }
    /**
     * The keyword settings for the build variant
     */
    get activeVariantSettings() {
        const pairs = this.extensionContext.workspaceState.get('activeVariantSettings');
        if (pairs) {
            return new Map(pairs);
        }
        else {
            return null;
        }
    }
    set activeVariantSettings(settings) {
        if (settings) {
            const pairs = Array.from(settings.entries());
            this.extensionContext.workspaceState.update('activeVariantSettings', pairs);
        }
        else {
            this.extensionContext.workspaceState.update('activeVariantSettings', null);
        }
    }
    /**
     * Rest all current workspace state. Mostly for troubleshooting
     */
    reset() {
        this.activeVariantSettings = null;
        this.launchTargetName = null;
        this.defaultBuildTarget = null;
        this.activeKitName = null;
    }
}
exports.StateManager = StateManager;
//# sourceMappingURL=state.js.map