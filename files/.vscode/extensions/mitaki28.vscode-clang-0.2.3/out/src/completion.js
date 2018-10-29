"use strict";
const vscode = require("vscode");
const path = require("path");
const clang = require("./clang");
const execution = require("./execution");
exports.completionRe = /^COMPLETION: (.*?)(?: : (.*))?$/;
exports.descriptionRe = /^(.*?)(?: : (.*))?$/;
exports.returnTypeRe = /\[#([^#]+)#\]/ig;
exports.argumentTypeRe = /\<#([^#]+)#\>/ig;
exports.optionalArgumentLeftRe = /\{#(,? ?.+?)(?=#\}|\{#)/ig;
exports.optionalArgumentRightRe = /#\}/ig;
const DELIMITERS = "~`!@#$%^&*()-+={}[]|\\'\";:/?<>,. \t\n";
function isDelimiter(c) {
    return DELIMITERS.indexOf(c) !== -1;
}
function findPreviousDelimiter(document, position) {
    let line = position.line;
    let char = position.character;
    const s = document.getText(new vscode.Range(line, 0, line, char));
    while (char > 0 && !isDelimiter(s[char - 1]))
        char--;
    return new vscode.Position(line, char);
}
class ClangCompletionItemProvider {
    provideCompletionItems(document, position, token) {
        return this.fetchCompletionItems(document, position, token)
            .then((data) => {
            return this.parseCompletionItems(data);
        }, (e) => {
            if (e.errorCode === execution.ErrorCode.BufferLimitExceed) {
                vscode.window.showWarningMessage("Completion was interpreted due to rack of buffer size. " +
                    "The buffer size can be increased using `clang.completion.maxBuffer`. ");
            }
            return [];
        });
    }
    fetchCompletionItems(document, position, token) {
        // Currently, Clang does NOT complete token partially 
        // So we find a previous delimiter and start complete from there.
        let delPos = findPreviousDelimiter(document, position);
        let [cmd, args] = clang.complete(document.languageId, delPos.line + 1, delPos.character + 1);
        return execution.processString(cmd, args, {
            cwd: path.dirname(document.uri.fsPath),
            maxBuffer: clang.getConf("completion.maxBuffer")
        }, token, document.getText()).then((result) => result.stdout.toString());
    }
    parseCompletionItem(line) {
        let matched = line.match(exports.completionRe);
        if (matched == null)
            return;
        let [_line, symbol, description] = matched;
        let item = new vscode.CompletionItem(symbol);
        if (description == null) {
            item.detail = symbol;
            item.kind = vscode.CompletionItemKind.Class;
            return item;
        }
        let [_description, signature, comment] = description.match(exports.descriptionRe);
        if (comment != null) {
            item.documentation = comment;
        }
        let hasValue = false;
        signature = signature.replace(exports.returnTypeRe, (match, arg) => {
            hasValue = true;
            return arg + " ";
        });
        signature = signature.replace(exports.argumentTypeRe, (match, arg) => {
            return arg;
        });
        signature = signature.replace(exports.optionalArgumentLeftRe, (match, arg) => {
            return arg + "=?";
        });
        signature = signature.replace(exports.optionalArgumentRightRe, (match, arg) => {
            return "";
        });
        item.detail = signature;
        if (signature.indexOf("(") !== -1) {
            item.kind = vscode.CompletionItemKind.Function;
        }
        else if (hasValue) {
            item.kind = vscode.CompletionItemKind.Variable;
        }
        else {
            item.kind = vscode.CompletionItemKind.Class;
        }
        return item;
    }
    parseCompletionItems(data) {
        let result = [];
        data.split(/\r\n|\r|\n/).forEach((line) => {
            let item = this.parseCompletionItem(line);
            if (item instanceof vscode.CompletionItem) {
                result.push(item);
            }
        });
        return result;
    }
}
exports.ClangCompletionItemProvider = ClangCompletionItemProvider;
//# sourceMappingURL=completion.js.map