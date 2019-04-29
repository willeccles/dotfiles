"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function setVisible(i, v) {
    if (v) {
        i.show();
    }
    else {
        i.hide();
    }
}
class StatusBar {
    constructor() {
        this._cmakeToolsStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.5);
        this._kitSelectionButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.45);
        this._buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.4);
        this._targetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.3);
        this._debugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.25);
        this._launchTargetNameButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.2);
        this._testButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.1);
        this._warningMessage = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3);
        this._visible = true;
        /**
         * The build type label. Determined by the active build variant
         */
        this._buildTypeLabel = 'Unconfigured';
        /**
         * The message shown in the primary status button. Tells the user what the
         * extension is currently up to.
         */
        this._statusMessage = 'Loading...';
        /**
         * The name of the currently active target to build
         */
        this._targetName = '';
        this._ctestEnabled = false;
        this._testResults = null;
        /**
         * Whether or not to show a 'Build' or 'Stop' button. Changes the content
         * of the button and the command that is executed when the button is pressed
         */
        this._isBusy = false;
        this._activeKitName = '';
        this._cmakeToolsStatusItem.command = 'cmake.setVariant';
        this._cmakeToolsStatusItem.tooltip = 'Click to select the current build variant';
        this._buildButton.command = 'cmake.build';
        this._kitSelectionButton.command = 'cmake.selectKit';
        this._kitSelectionButton.tooltip = 'Click to change the active kit';
        this._targetButton.command = 'cmake.setDefaultTarget';
        this._targetButton.tooltip = 'Set the active target to build';
        this._testButton.command = 'cmake.ctest';
        this._testButton.tooltip = 'Run CTest tests';
        this._debugButton.tooltip = 'Launch the debugger for the selected target';
        this._debugButton.command = 'cmake.debugTarget';
        this._launchTargetNameButton.command = 'cmake.selectLaunchTarget';
        this._launchTargetNameButton.tooltip = 'Select the target to launch';
        this._reloadBuildButton();
        this.reloadVisibility();
    }
    dispose() {
        const items = [
            this._cmakeToolsStatusItem,
            this._kitSelectionButton,
            this._buildButton,
            this._targetButton,
            this._launchTargetNameButton,
            this._testButton,
            this._warningMessage,
        ];
        for (const item of items) {
            item.dispose();
        }
    }
    reloadVisibility() {
        const autovis_items = [
            this._cmakeToolsStatusItem,
            this._buildButton,
            this._kitSelectionButton,
            this._targetButton,
            this._debugButton,
            this._launchTargetNameButton,
        ];
        for (const item of autovis_items) {
            setVisible(item, this._visible && !!item.text);
        }
        setVisible(this._debugButton, this._visible && vscode.extensions.getExtension('ms-vscode.cpptools') !== undefined
            && !!this._debugButton.text);
    }
    /**
     * Whether the status bar items are visible
     */
    setVisible(v) {
        this._visible = v;
        this.reloadVisibility();
    }
    _reloadStatusButton() {
        this._cmakeToolsStatusItem.text = `CMake: ${this._buildTypeLabel}: ${this._statusMessage}`;
        this.reloadVisibility();
    }
    _reloadDebugButton() {
        if (!this._launchTargetNameButton.text) {
            this._debugButton.text = '$(bug)';
            this._launchTargetNameButton.hide();
        }
        else {
            this._debugButton.text = '$(bug) Debug';
            if (this._visible) {
                this._launchTargetNameButton.show();
            }
        }
        this.reloadVisibility();
    }
    setBuildTypeLabel(v) {
        this._buildTypeLabel = v;
        this._reloadStatusButton();
    }
    setStatusMessage(v) {
        this._statusMessage = v;
        this._reloadStatusButton();
    }
    get targetName() { return this._targetName; }
    set targetName(v) {
        this._targetName = v;
        this._targetButton.text = `[${v}]`;
        this.reloadVisibility();
    }
    setLaunchTargetName(v) {
        this._launchTargetNameButton.text = v;
        this._reloadDebugButton();
    }
    get ctestEnabled() { return this._ctestEnabled; }
    set ctestEnabled(v) {
        this._ctestEnabled = v;
        setVisible(this._testButton, v);
    }
    get testResults() { return this._testResults; }
    set testResults(v) {
        this._testResults = v;
        if (!v) {
            this._testButton.text = 'Run CTest';
            this._testButton.color = '';
            return;
        }
        const passing = v.passing;
        const total = v.total;
        const good = passing == total;
        const icon = good ? 'check' : 'x';
        this._testButton.text = `$(${icon}) ${passing}/${total} ${total == 1 ? 'test' : 'tests'} passing`;
        this._testButton.color = good ? 'lightgreen' : 'yellow';
    }
    /** Reloads the content of the build button */
    _reloadBuildButton() {
        this._buildButton.text = ``;
        this._buildButton.text = this._isBusy ? `$(x) Stop` : `$(gear) Build:`;
        this._buildButton.command = this._isBusy ? 'cmake.stop' : 'cmake.build';
        if (this._isBusy) {
            this._buildButton.show();
        }
    }
    setIsBusy(v) {
        this._isBusy = v;
        this._reloadBuildButton();
    }
    _reloadKitsButton() {
        if (this._visible) {
            if (this._activeKitName.length) {
                this._kitSelectionButton.text = this._activeKitName;
            }
            else {
                this._kitSelectionButton.text = 'No Kit Selected';
            }
            this.reloadVisibility();
        }
        else {
            this._kitSelectionButton.hide();
        }
    }
    setActiveKitName(v) {
        if (v === '__unspec__') {
            this._activeKitName = '[No active kit]';
        }
        else {
            this._activeKitName = v;
        }
        this._reloadKitsButton();
    }
    showWarningMessage(msg) {
        this._warningMessage.color = 'yellow';
        this._warningMessage.text = `$(alert) ${msg}`;
        this._warningMessage.show();
        setTimeout(() => this._warningMessage.hide(), 5000);
    }
}
exports.StatusBar = StatusBar;
//# sourceMappingURL=status.js.map