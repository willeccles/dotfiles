"use strict";
/**
 * Module for working with and performing expansion of template strings
 * with `${var}`-style variable template expressions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const logging_1 = require("./logging");
const util_1 = require("./util");
const log = logging_1.createLogger('expand');
/**
 * Replace ${variable} references in the given string with their corresponding
 * values.
 * @param instr The input string
 * @param opts Options for the expansion process
 * @returns A string with the variable references replaced
 */
async function expandString(tmpl, opts) {
    const env = opts.envOverride ? opts.envOverride : process.env;
    const repls = opts.vars;
    // We accumulate a list of substitutions that we need to make, preventing
    // recursively expanding or looping forever on bad replacements
    const subs = new Map();
    const var_re = /\$\{(\w+)\}/g;
    let mat = null;
    while ((mat = var_re.exec(tmpl))) {
        const full = mat[0];
        const key = mat[1];
        const repl = repls[key];
        if (!repl) {
            log.warning(`Invalid variable reference ${full} in string: ${tmpl}`);
        }
        else {
            subs.set(full, repl);
        }
    }
    const env_re = /\$\{env:(.+?)\}/g;
    while ((mat = env_re.exec(tmpl))) {
        const full = mat[0];
        const varname = mat[1];
        const repl = env[util_1.normalizeEnvironmentVarname(varname)] || '';
        subs.set(full, repl);
    }
    const env_re2 = /\$\{env\.(.+?)\}/g;
    while ((mat = env_re2.exec(tmpl))) {
        const full = mat[0];
        const varname = mat[1];
        const repl = env[util_1.normalizeEnvironmentVarname(varname)] || '';
        subs.set(full, repl);
    }
    if (opts.variantVars) {
        const variants = opts.variantVars;
        const variant_regex = /\$\{variant:(.+?)\}/g;
        while ((mat = variant_regex.exec(tmpl))) {
            const full = mat[0];
            const varname = mat[1];
            const repl = variants[varname] || '';
            subs.set(full, repl);
        }
    }
    const command_re = /\$\{command:(.+?)\}/g;
    while ((mat = command_re.exec(tmpl))) {
        const full = mat[0];
        const command = mat[1];
        if (subs.has(full)) {
            continue; // Don't execute commands more than once per string
        }
        try {
            const command_ret = await vscode.commands.executeCommand(command);
            subs.set(full, `${command_ret}`);
        }
        catch (e) {
            log.warning(`Exception while executing command ${command} for string: ${tmpl} (${e})`);
        }
    }
    let final_str = tmpl;
    subs.forEach((value, key) => { final_str = util_1.replaceAll(final_str, key, value); });
    return final_str;
}
exports.expandString = expandString;
//# sourceMappingURL=expand.js.map