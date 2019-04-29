"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const path = require("path");
const vscode = require("vscode");
const proc_1 = require("./proc");
/**
 * Escape a string so it can be used as a regular expression
 */
function escapeStringForRegex(str) { return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'); }
exports.escapeStringForRegex = escapeStringForRegex;
/**
 * Replace all occurrences of `needle` in `str` with `what`
 * @param str The input string
 * @param needle The search string
 * @param what The value to insert in place of `needle`
 * @returns The modified string
 */
function replaceAll(str, needle, what) {
    const pattern = escapeStringForRegex(needle);
    const re = new RegExp(pattern, 'g');
    return str.replace(re, what);
}
exports.replaceAll = replaceAll;
/**
 * Remove all occurrences of a list of strings from a string.
 * @param str The input string
 * @param patterns Strings to remove from `str`
 * @returns The modified string
 */
function removeAllPatterns(str, patterns) {
    return patterns.reduce((acc, needle) => replaceAll(acc, needle, ''), str);
}
exports.removeAllPatterns = removeAllPatterns;
/**
 * Completely normalize/canonicalize a path.
 * Using `path.normalize` isn't sufficient. We want convert all paths to use
 * POSIX separators, remove redundant separators, and sometimes normalize the
 * case of the path.
 *
 * @param p The input path
 * @param opt Options to control the normalization
 * @returns The normalized path
 */
function normalizePath(p, opt) {
    const normCase = opt ? opt.normCase ? opt.normCase : 'never' : 'never';
    const normUnicode = opt ? opt.normUnicode ? opt.normUnicode : 'never' : 'never';
    let norm = path.normalize(p);
    while (path.sep !== path.posix.sep && norm.includes(path.sep)) {
        norm = norm.replace(path.sep, path.posix.sep);
    }
    // Normalize for case an unicode
    switch (normCase) {
        case 'always':
            norm = norm.toLocaleLowerCase();
            break;
        case 'platform':
            if (process.platform === 'win32' || process.platform === 'darwin') {
                norm = norm.toLocaleLowerCase();
            }
            break;
        case 'never':
            break;
    }
    switch (normUnicode) {
        case 'always':
            norm = norm.normalize();
            break;
        case 'platform':
            if (process.platform === 'darwin') {
                norm = norm.normalize();
            }
            break;
        case 'never':
            break;
    }
    // Remove trailing slashes
    norm = norm.replace(/\/$/g, '');
    // Remove duplicate slashes
    while (norm.includes('//')) {
        norm = replaceAll(norm, '//', '/');
    }
    return norm;
}
exports.normalizePath = normalizePath;
function lightNormalizePath(p) {
    return normalizePath(p, { normCase: 'never', normUnicode: 'never' });
}
exports.lightNormalizePath = lightNormalizePath;
function platformNormalizePath(p) {
    return normalizePath(p, { normCase: 'platform', normUnicode: 'platform' });
}
exports.platformNormalizePath = platformNormalizePath;
function heavyNormalizePath(p) {
    return normalizePath(p, { normCase: 'always', normUnicode: 'always' });
}
exports.heavyNormalizePath = heavyNormalizePath;
function resolvePath(inpath, base) {
    return path.isAbsolute(inpath) ? inpath : lightNormalizePath(path.join(base, inpath));
}
exports.resolvePath = resolvePath;
/**
 * Split a path into its elements.
 * @param p The path to split
 */
function splitPath(p) {
    if (p.length === 0 || p === '.') {
        return [];
    }
    const pardir = path.dirname(p);
    if (pardir === p) {
        // We've reach a root path. (Might be a Windows drive dir)
        return [p];
    }
    const arr = [];
    if (p.startsWith(pardir)) {
        arr.push(...splitPath(pardir));
    }
    arr.push(path.basename(p));
    return arr;
}
exports.splitPath = splitPath;
/**
 * Check if a value is "truthy" according to CMake's own language rules
 * @param value The value to check
 */
function isTruthy(value) {
    if (typeof value === 'string') {
        return !(['', 'FALSE', 'OFF', '0', 'NOTFOUND', 'NO', 'N', 'IGNORE'].indexOf(value) >= 0
            || value.endsWith('-NOTFOUND'));
    }
    // Numbers/bools/etc. follow common C-style truthiness
    return !!value;
}
exports.isTruthy = isTruthy;
/**
 * Generate an array of key-value pairs from an object using
 * `getOwnPropertyNames`
 * @param obj The object to iterate
 */
function objectPairs(obj) {
    return Object.getOwnPropertyNames(obj).map(key => [key, obj[key]]);
}
exports.objectPairs = objectPairs;
/**
 * Map an iterable by some projection function
 * @param iter An iterable to map
 * @param proj The projection function
 */
function* map(iter, proj) {
    for (const item of iter) {
        yield proj(item);
    }
}
exports.map = map;
function* chain(...iter) {
    for (const sub of iter) {
        for (const item of sub) {
            yield item;
        }
    }
}
exports.chain = chain;
function reduce(iter, init, mapper) {
    for (const item of iter) {
        init = mapper(init, item);
    }
    return init;
}
exports.reduce = reduce;
function find(iter, predicate) {
    for (const value of iter) {
        if (predicate(value)) {
            return value;
        }
    }
    // Nothing found
    return undefined;
}
exports.find = find;
/**
 * Generate a random integral value.
 * @param min Minimum value
 * @param max Maximum value
 */
function randint(min, max) { return Math.floor(Math.random() * (max - min) + min); }
exports.randint = randint;
function product(arrays) {
    // clang-format off
    return arrays.reduce((acc, curr) => acc
        // Append each element of the current array to each list already accumulated
        .map(prev => curr.map(item => prev.concat(item)))
        .reduce(
    // Join all the lists
    (a, b) => a.concat(b), []), [[]]);
    // clang-format on
}
exports.product = product;
function cmakeify(value) {
    const ret = {
        type: 'UNKNOWN',
        value: '',
    };
    if (value === true || value === false) {
        ret.type = 'BOOL';
        ret.value = value ? 'TRUE' : 'FALSE';
    }
    else if (typeof (value) === 'string') {
        ret.type = 'STRING';
        ret.value = replaceAll(value, ';', '\\;');
    }
    else if (typeof value === 'number') {
        ret.type = 'STRING';
        ret.value = value.toString();
    }
    else if (value instanceof Array) {
        ret.type = 'STRING';
        ret.value = value.join(';');
    }
    else {
        throw new Error(`Invalid value to convert to cmake value: ${value}`);
    }
    return ret;
}
exports.cmakeify = cmakeify;
async function termProc(child) {
    // Stopping the process isn't as easy as it may seem. cmake --build will
    // spawn child processes, and CMake won't forward signals to its
    // children. As a workaround, we list the children of the cmake process
    // and also send signals to them.
    await _killTree(child.pid);
    return true;
}
exports.termProc = termProc;
async function _killTree(pid) {
    if (process.platform !== 'win32') {
        let children = [];
        const stdout = (await proc_1.execute('pgrep', ['-P', pid.toString()], null, { silent: true }).result).stdout.trim();
        if (!!stdout.length) {
            children = stdout.split('\n').map(line => Number.parseInt(line));
        }
        for (const other of children) {
            if (other)
                await _killTree(other);
        }
        try {
            process.kill(pid, 'SIGINT');
        }
        catch (e) {
            if (e.code === 'ESRCH') {
                // Do nothing. We're okay.
            }
            else {
                throw e;
            }
        }
    }
    else {
        // Because reasons, Node's proc.kill doesn't work on killing child
        // processes transitively. We have to do a sad and manually kill the
        // task using taskkill.
        child_process.exec(`taskkill /pid ${pid.toString()} /T /F`);
    }
}
function splitCommandLine(cmd) {
    const cmd_re = /('(\\'|[^'])*'|"(\\"|[^"])*"|(\\ |[^ ])+|[\w-]+)/g;
    const quoted_args = cmd.match(cmd_re);
    console.assert(quoted_args);
    // Our regex will parse escaped quotes, but they remain. We must
    // remove them ourselves
    return quoted_args.map(arg => arg.replace(/\\(")/g, '$1').replace(/^"(.*)"$/g, '$1'));
}
exports.splitCommandLine = splitCommandLine;
function isMultiConfGenerator(gen) {
    return gen.includes('Visual Studio') || gen.includes('Xcode');
}
exports.isMultiConfGenerator = isMultiConfGenerator;
class InvalidVersionString extends Error {
}
exports.InvalidVersionString = InvalidVersionString;
function parseVersion(str) {
    const version_re = /(\d+)\.(\d+)\.(\d+)/;
    const mat = version_re.exec(str);
    if (!mat) {
        throw new InvalidVersionString(`Invalid version string ${str}`);
    }
    const [, major, minor, patch] = mat;
    return {
        major: parseInt(major),
        minor: parseInt(minor),
        patch: parseInt(patch),
    };
}
exports.parseVersion = parseVersion;
function versionToString(ver) { return `${ver.major}.${ver.minor}.${ver.patch}`; }
exports.versionToString = versionToString;
function* flatMap(rng, fn) {
    for (const elem of rng) {
        const mapped = fn(elem);
        for (const other_elem of mapped) {
            yield other_elem;
        }
    }
}
exports.flatMap = flatMap;
function mergeEnvironment(...env) {
    return env.reduce((acc, vars) => {
        if (process.platform === 'win32') {
            // Env vars on windows are case insensitive, so we take the ones from
            // active env and overwrite the ones in our current process env
            const norm_vars = Object.getOwnPropertyNames(vars).reduce((acc2, key) => {
                acc2[key.toUpperCase()] = vars[key];
                return acc2;
            }, {});
            return Object.assign({}, acc, norm_vars);
        }
        else {
            return Object.assign({}, acc, vars);
        }
    }, {});
}
exports.mergeEnvironment = mergeEnvironment;
function normalizeEnvironmentVarname(varname) {
    return process.platform == 'win32' ? varname.toLocaleLowerCase() : varname;
}
exports.normalizeEnvironmentVarname = normalizeEnvironmentVarname;
function parseCompileDefinition(str) {
    if (/^\w+$/.test(str)) {
        return [str, null];
    }
    else {
        const key = str.split('=', 1)[0];
        return [key, str.substr(key.length + 1)];
    }
}
exports.parseCompileDefinition = parseCompileDefinition;
function thisExtension() {
    const ext = vscode.extensions.getExtension('vector-of-bool.cmake-tools');
    if (!ext) {
        throw new Error('Out own extension is null! What gives?');
    }
    return ext;
}
exports.thisExtension = thisExtension;
function thisExtensionPackage() {
    const pkg = thisExtension().packageJSON;
    return {
        name: pkg.name,
        version: pkg.version,
    };
}
exports.thisExtensionPackage = thisExtensionPackage;
function thisExtensionPath() { return thisExtension().extensionPath; }
exports.thisExtensionPath = thisExtensionPath;
function dropNulls(items) {
    return items.filter(item => (item !== null && item !== undefined));
}
exports.dropNulls = dropNulls;
var Ordering;
(function (Ordering) {
    Ordering[Ordering["Greater"] = 0] = "Greater";
    Ordering[Ordering["Equivalent"] = 1] = "Equivalent";
    Ordering[Ordering["Less"] = 2] = "Less";
})(Ordering = exports.Ordering || (exports.Ordering = {}));
function compareVersions(a, b) {
    if (typeof a === 'string') {
        a = parseVersion(a);
    }
    if (typeof b === 'string') {
        b = parseVersion(b);
    }
    // Compare major
    if (a.major > b.major) {
        return Ordering.Greater;
    }
    else if (a.major < b.major) {
        return Ordering.Less;
        // Compare minor
    }
    else if (a.minor > b.minor) {
        return Ordering.Greater;
    }
    else if (a.minor < b.minor) {
        return Ordering.Less;
        // Compare patch
    }
    else if (a.patch > b.patch) {
        return Ordering.Greater;
    }
    else if (a.patch < b.patch) {
        return Ordering.Less;
        // No difference:
    }
    else {
        return Ordering.Equivalent;
    }
}
exports.compareVersions = compareVersions;
function versionGreater(lhs, rhs) {
    return compareVersions(lhs, rhs) === Ordering.Greater;
}
exports.versionGreater = versionGreater;
function versionEquals(lhs, rhs) {
    return compareVersions(lhs, rhs) === Ordering.Equivalent;
}
exports.versionEquals = versionEquals;
function versionLess(lhs, rhs) {
    return compareVersions(lhs, rhs) === Ordering.Less;
}
exports.versionLess = versionLess;
function compare(a, b) {
    const a_json = JSON.stringify(a);
    const b_json = JSON.stringify(b);
    if (a_json < b_json) {
        return Ordering.Less;
    }
    else if (a_json > b_json) {
        return Ordering.Greater;
    }
    else {
        return Ordering.Equivalent;
    }
}
exports.compare = compare;
function platformPathCompare(a, b) {
    return compare(platformNormalizePath(a), platformNormalizePath(b));
}
exports.platformPathCompare = platformPathCompare;
function platformPathEquivalent(a, b) {
    return platformPathCompare(a, b) === Ordering.Equivalent;
}
exports.platformPathEquivalent = platformPathEquivalent;
function setContextValue(key, value) {
    return vscode.commands.executeCommand('setContext', key, value);
}
exports.setContextValue = setContextValue;
class DummyDisposable {
    dispose() { }
}
exports.DummyDisposable = DummyDisposable;
function lexicographicalCompare(a, b) {
    const a_iter = a[Symbol.iterator]();
    const b_iter = b[Symbol.iterator]();
    while (1) {
        const a_res = a_iter.next();
        const b_res = b_iter.next();
        if (a_res.done) {
            if (b_res.done) {
                return 0; // Same elements
            }
            else {
                // a is "less" (shorter string)
                return -1;
            }
        }
        else if (b_res.done) {
            // b is "less" (shorter)
            return 1;
        }
        else {
            const comp_res = a_res.value.localeCompare(b_res.value);
            if (comp_res !== 0) {
                return comp_res;
            }
        }
    }
    // Loop analysis can't help us. TS believes we run off the end of
    // the function.
    console.assert(false, 'Impossible code path');
    return 0;
}
exports.lexicographicalCompare = lexicographicalCompare;
//# sourceMappingURL=util.js.map