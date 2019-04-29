Object.defineProperty(exports, "__esModule", { value: true });
const util = require("../common");
const vscode = require("vscode");
class RefreshButton {
    get iconPath() {
        const refreshImagePathDark = util.getExtensionFilePath("assets/Refresh_inverse.svg");
        const refreshImagePathLight = util.getExtensionFilePath("assets/Refresh.svg");
        return {
            dark: vscode.Uri.file(refreshImagePathDark),
            light: vscode.Uri.file(refreshImagePathLight)
        };
    }
    get tooltip() {
        return "Refresh process list";
    }
}
function showQuickPick(getAttachItems) {
    return getAttachItems().then(processEntries => {
        return new Promise((resolve, reject) => {
            let quickPick = vscode.window.createQuickPick();
            quickPick.title = "Attach to process";
            quickPick.canSelectMany = false;
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;
            quickPick.placeholder = "Select the process to attach to";
            quickPick.items = processEntries;
            quickPick.buttons = [new RefreshButton()];
            let disposables = [];
            quickPick.onDidTriggerButton(button => {
                getAttachItems().then(processEntries => quickPick.items = processEntries);
            }, undefined, disposables);
            quickPick.onDidAccept(() => {
                if (quickPick.selectedItems.length !== 1) {
                    reject(new Error("Process not selected"));
                }
                let selectedId = quickPick.selectedItems[0].id;
                disposables.forEach(item => item.dispose());
                quickPick.dispose();
                resolve(selectedId);
            }, undefined, disposables);
            quickPick.onDidHide(() => {
                disposables.forEach(item => item.dispose());
                quickPick.dispose();
                reject(new Error("Process not selected."));
            }, undefined, disposables);
            quickPick.show();
        });
    });
}
exports.showQuickPick = showQuickPick;
//# sourceMappingURL=attachQuickPick.js.map