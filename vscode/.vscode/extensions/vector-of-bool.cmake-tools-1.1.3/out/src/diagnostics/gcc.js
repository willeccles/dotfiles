"use strict";
/**
 * Module for handling GCC diagnostics
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
exports.REGEX = /^(.*):(\d+):(\d+):\s+(?:fatal )?(\w*)(?:\sfatale)?\s?:\s+(.*)/;
class Parser extends util_1.RawDiagnosticParser {
    doHandleLine(line) {
        let mat = /(.*): (In instantiation of.+)/.exec(line);
        if (mat) {
            const [, , message] = mat;
            this._pendingTemplateError = {
                rootInstantiation: message,
                requiredFrom: [],
            };
            return util_1.FeedLineResult.Ok;
        }
        if (this._pendingTemplateError) {
            mat = /(.*):(\d+):(\d+):(  +required from.+)/.exec(line);
            if (mat) {
                const [, file, linestr, column, message] = mat;
                const lineNo = util_1.oneLess(linestr);
                this._pendingTemplateError.requiredFrom.push({
                    file,
                    location: new vscode.Range(lineNo, parseInt(column), lineNo, 999),
                    message,
                });
                return util_1.FeedLineResult.Ok;
            }
        }
        // Early-catch backtrace limit notes
        mat = /note: \((.*backtrace-limit.*)\)/.exec(line);
        if (mat && this._prevDiag && this._prevDiag.related.length !== 0) {
            const prevRelated = this._prevDiag.related[0];
            this._prevDiag.related.push({
                file: prevRelated.file,
                location: prevRelated.location,
                message: mat[1],
            });
            return util_1.FeedLineResult.Ok;
        }
        // Test if this is a diagnostic
        mat = exports.REGEX.exec(line);
        if (!mat) {
            // Nothing to see on this line of output...
            return util_1.FeedLineResult.NotMine;
        }
        else {
            const [full, file, lineno_, column_, severity, message] = mat;
            if (file && lineno_ && column_ && severity && message) {
                const lineno = util_1.oneLess(lineno_);
                const column = util_1.oneLess(column_);
                if (severity === 'note' && this._prevDiag) {
                    this._prevDiag.related.push({
                        file,
                        location: new vscode.Range(lineno, column, lineno, 999),
                        message,
                    });
                    return util_1.FeedLineResult.Ok;
                }
                else {
                    const related = [];
                    const location = new vscode.Range(lineno, column, lineno, 999);
                    if (this._pendingTemplateError) {
                        related.push({
                            location,
                            file,
                            message: this._pendingTemplateError.rootInstantiation,
                        });
                        related.push(...this._pendingTemplateError.requiredFrom);
                        this._pendingTemplateError = undefined;
                    }
                    return this._prevDiag = {
                        full,
                        file,
                        location,
                        severity,
                        message,
                        related,
                    };
                }
            }
            return util_1.FeedLineResult.NotMine;
        }
    }
}
exports.Parser = Parser;
//# sourceMappingURL=gcc.js.map