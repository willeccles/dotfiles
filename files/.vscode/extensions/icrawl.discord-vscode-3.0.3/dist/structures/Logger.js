"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class Logger {
    static setup() {
        this.output = this.output || vscode_1.window.createOutputChannel('Discord Presence');
    }
    static log(message) {
        if (!this.output)
            this.setup();
        this.output.appendLine(message);
    }
}
exports.default = Logger;

//# sourceMappingURL=Logger.js.map
