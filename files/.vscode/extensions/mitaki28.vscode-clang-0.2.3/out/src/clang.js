"use strict";
const vscode = require("vscode");
const variable = require("./variable");
const deprecatedMap = new Map(new Array(["diagnostic.delay", "diagnosticDelay"], ["diagnostic.enable", "enableDiagnostic"], ["completion.enable", "enableCompletion"]));
function getConf(name) {
    let conf = vscode.workspace.getConfiguration("clang");
    if (deprecatedMap.has(name)) {
        let depName = deprecatedMap.get(name);
        let value = conf.get(depName);
        if (value != null) {
            vscode.window.showWarningMessage(`clang.${depName} is deprecated. Please use ${name} instead.`);
            return value;
        }
    }
    let value = conf.get(name);
    if (value == null) {
        vscode.window.showErrorMessage(`Error: invalid configuration ${name}`);
    }
    return value;
}
exports.getConf = getConf;
function command(language, ...options) {
    let cmd = variable.resolve(getConf("executable"));
    let args = [];
    if (language === "cpp") {
        args.push("-x", "c++");
        args.push(...getConf("cxxflags").map(variable.resolve));
    }
    else if (language === "c") {
        args.push("-x", "c");
        args.push(...getConf("cflags").map(variable.resolve));
    }
    else if (language === "objective-c") {
        args.push("-x", "objective-c");
        args.push(...getConf("objcflags").map(variable.resolve));
    }
    args.push(...options);
    return [cmd, args];
}
exports.command = command;
function complete(language, line, char) {
    let args = [];
    args.push("-fsyntax-only");
    args.push("-fparse-all-comments");
    if (getConf("completion.completeMacros")) {
        args.push("-Xclang", "-code-completion-macros");
    }
    args.push("-Xclang", "-code-completion-brief-comments");
    args.push("-Xclang", `-code-completion-at=<stdin>:${line}:${char}`);
    args.push("-");
    return command(language, ...args);
}
exports.complete = complete;
function check(language) {
    return command(language, "-fsyntax-only", "-fno-caret-diagnostics", "-fdiagnostics-print-source-range-info", "-fno-color-diagnostics", "-");
}
exports.check = check;
function version(language) {
    return command(language, "--version");
}
exports.version = version;
//# sourceMappingURL=clang.js.map