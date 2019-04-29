"use strict";
/**
 * Module for handling MSVC diagnostics
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
exports.REGEX = /^\s*(?!\d+>)?\s*([^\s>].*)\((\d+|\d+,\d+|\d+,\d+,\d+,\d+)\):\s+((?:fatal )?error|warning|info)\s+(\w{1,2}\d+)\s*:\s*(.*)$/;
class Parser extends util_1.RawDiagnosticParser {
    doHandleLine(line) {
        const res = exports.REGEX.exec(line);
        if (!res) {
            return util_1.FeedLineResult.NotMine;
        }
        const [full, file, location, severity, code, message] = res;
        const range = (() => {
            const parts = location.split(',');
            const n0 = util_1.oneLess(parts[0]);
            if (parts.length === 1)
                return new vscode.Range(n0, 0, n0, 999);
            if (parts.length === 2) {
                const n1 = util_1.oneLess(parts[1]);
                return new vscode.Range(n0, n1, n0, n1);
            }
            if (parts.length === 4) {
                const n1 = util_1.oneLess(parts[1]);
                const n2 = util_1.oneLess(parts[2]);
                const n3 = util_1.oneLess(parts[3]);
                return new vscode.Range(n0, n1, n2, n3);
            }
            throw new Error('Unable to determine location of MSVC diagnostic');
        })();
        return {
            full,
            file,
            location: range,
            severity,
            message,
            code,
            related: [],
        };
    }
}
exports.Parser = Parser;
//# sourceMappingURL=msvc.js.map