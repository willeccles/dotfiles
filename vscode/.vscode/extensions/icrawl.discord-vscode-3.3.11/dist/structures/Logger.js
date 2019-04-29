"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode"); // tslint:disable-line
// tslint:disable-next-line
class Logger {
    static _setup() {
        this._output = this._output || vscode_1.window.createOutputChannel('Discord Presence');
    }
    static log(message) {
        if (!this._output)
            this._setup();
        this._output.appendLine(message);
    }
}
exports.default = Logger;

//# sourceMappingURL=Logger.js.map
