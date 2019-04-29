"use strict";
const vscode = require("vscode");
const path = require("path");
const clang = require("./clang");
const execution = require("./execution");
exports.diagnosticRe = /^\<stdin\>:(\d+):(\d+):(?:((?:\{.+?\})+):)? ((?:fatal )?error|warning): (.*?)$/;
function str2diagserv(str) {
    switch (str) {
        case "fatal error": return vscode.DiagnosticSeverity.Error;
        case "error": return vscode.DiagnosticSeverity.Error;
        case "warning": return vscode.DiagnosticSeverity.Warning;
        default: return vscode.DiagnosticSeverity.Information;
    }
}
function delay(token) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(() => {
            resolve();
        }, clang.getConf("diagnostic.delay"));
        token.onCancellationRequested(() => {
            clearTimeout(timer);
            reject();
        });
    });
}
function registerDiagnosticProvider(selector, provider, name) {
    let collection = vscode.languages.createDiagnosticCollection(name);
    let cancellers = new Map();
    let subsctiptions = [];
    vscode.workspace.onDidChangeTextDocument((change) => {
        if (!vscode.languages.match(selector, change.document))
            return;
        const uri = change.document.uri;
        const uriStr = uri.toString();
        if (cancellers.has(uriStr)) {
            cancellers.get(uriStr).cancel();
            cancellers.get(uriStr).dispose();
        }
        cancellers.set(uriStr, new vscode.CancellationTokenSource);
        delay(cancellers.get(uriStr).token).then(() => {
            cancellers.get(uriStr).dispose();
            cancellers.set(uriStr, new vscode.CancellationTokenSource);
            return provider.provideDiagnostic(change.document, cancellers.get(uriStr).token);
        }).then((diagnostics) => {
            cancellers.get(uriStr).dispose();
            cancellers.delete(uriStr);
            collection.set(uri, diagnostics);
        }, (_) => { });
    }, null, subsctiptions);
    return {
        dispose() {
            collection.dispose();
            for (let canceller of Array.from(cancellers.values())) {
                canceller.cancel();
                canceller.dispose();
            }
            vscode.Disposable.from(...subsctiptions).dispose();
        }
    };
}
exports.registerDiagnosticProvider = registerDiagnosticProvider;
function parseRanges(s) {
    let p = 0;
    let parseDigit = () => {
        let ans = 0;
        while (s[p].match(/[0-9]/)) {
            ans = 10 * ans + parseInt(s[p++], 10);
        }
        return ans;
    };
    let result = [];
    while (s[p] === "{") {
        s[p++]; // s[p] == "{"
        let ans = 0;
        let sline = parseDigit();
        s[p++]; // s[p] == ":"
        let schar = parseDigit();
        s[p++]; // s[p] == "-"
        let eline = parseDigit();
        s[p++]; // s[p] == ":"
        let echar = parseDigit();
        s[p++]; // s[p] == "}"
        result.push(new vscode.Range(sline, schar, eline, echar));
    }
    return result;
}
class ClangDiagnosticProvider {
    provideDiagnostic(document, token) {
        return this.fetchDiagnostic(document, token)
            .then((data) => {
            return this.parseDiagnostic(data);
        }, (e) => {
            if (e.errorCode === execution.ErrorCode.BufferLimitExceed) {
                vscode.window.showWarningMessage("Diagnostic was interpreted due to rack of buffer size. " +
                    "The buffer size can be increased using `clang.diagnostic.maxBuffer`. ");
            }
            return "";
        });
    }
    fetchDiagnostic(document, token) {
        let [cmd, args] = clang.check(document.languageId);
        return execution.processString(cmd, args, {
            cwd: path.dirname(document.uri.fsPath),
            maxBuffer: clang.getConf("diagnostic.maxBuffer")
        }, token, document.getText()).then((result) => result.stderr.toString());
    }
    parseDiagnostic(data) {
        let result = [];
        data.split(/\r\n|\r|\n/).forEach((line) => {
            let matched = line.match(exports.diagnosticRe);
            if (!matched)
                return;
            let range;
            if (matched[3] == null) {
                let line = parseInt(matched[1], 10);
                let char = parseInt(matched[2], 10);
                range = new vscode.Range(line - 1, char - 1, line - 1, char - 1);
            }
            else {
                let ranges = parseRanges(matched[3]);
                range = new vscode.Range(ranges[0].start.line - 1, ranges[0].start.character - 1, ranges[ranges.length - 1].end.line - 1, ranges[ranges.length - 1].end.character - 1);
            }
            let msg = matched[5];
            let type = str2diagserv(matched[4]);
            result.push(new vscode.Diagnostic(range, msg, type));
        });
        return result;
    }
}
exports.ClangDiagnosticProvider = ClangDiagnosticProvider;
//# sourceMappingURL=diagnostic.js.map