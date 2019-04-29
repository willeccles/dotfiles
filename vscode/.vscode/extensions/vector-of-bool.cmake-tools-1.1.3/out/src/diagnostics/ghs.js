"use strict";
/**
 * Module for parsing GHS diagnostics
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
exports.REGEX = /^\"(.*)\",\s+(?:(?:line\s+(\d+)\s+\(col\.\s+(\d+)\))|(?:At end of source)):\s+(?:fatal )?(remark|warning|error)\s+(.*)/;
class Parser extends util_1.RawDiagnosticParser {
    doHandleLine(line) {
        const mat = exports.REGEX.exec(line);
        if (!mat) {
            // Nothing to see on this line of output...
            return util_1.FeedLineResult.NotMine;
        }
        const [full, file, lineno = '1', column = '1', severity, message] = mat;
        if (file && severity && message) {
            return {
                full,
                file,
                location: new vscode.Range(util_1.oneLess(lineno), util_1.oneLess(column), util_1.oneLess(lineno), 999),
                severity,
                message,
                related: [],
            };
        }
        return util_1.FeedLineResult.NotMine;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=ghs.js.map