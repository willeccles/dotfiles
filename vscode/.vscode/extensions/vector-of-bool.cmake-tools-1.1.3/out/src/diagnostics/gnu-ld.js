"use strict";
/**
 * Module for handling GNU linker diagnostics
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
exports.REGEX = /^(.*):(\d+)\s?:\s+(.*[^\]])$/;
class Parser extends util_1.RawDiagnosticParser {
    doHandleLine(line) {
        // Try to parse for GNU ld
        if (line.startsWith('make')) {
            // This is a Make error. It may *look* like an LD error, so we abort early
            return util_1.FeedLineResult.NotMine;
        }
        const res = exports.REGEX.exec(line);
        if (!res) {
            return util_1.FeedLineResult.NotMine;
        }
        const [full, file, lineno_, message] = res;
        const lineno = util_1.oneLess(lineno_);
        if (file && lineno && message) {
            return {
                full,
                file,
                location: new vscode.Range(lineno, 0, lineno, 999),
                severity: 'error',
                message,
                related: [],
            };
        }
        return util_1.FeedLineResult.NotMine;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=gnu-ld.js.map