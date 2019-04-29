"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proc = require("@cmt/proc");
const logging_1 = require("./logging");
const log = logging_1.createLogger('debugger');
var DebuggerType;
(function (DebuggerType) {
    DebuggerType["VisualStudio"] = "Visual Studio";
    DebuggerType["LLDB"] = "LLDB";
    DebuggerType["GDB"] = "GDB";
    // LAUNCH // Future
})(DebuggerType = exports.DebuggerType || (exports.DebuggerType = {}));
async function createGDBDebugConfiguration(debuggerPath, target) {
    if (!await checkDebugger(debuggerPath)) {
        debuggerPath = 'gdb';
        if (!await checkDebugger(debuggerPath)) {
            throw new Error(`Unable to find GDB in default search path and ${debuggerPath}.`);
        }
    }
    return {
        type: 'cppdbg',
        name: `Debug ${target.name}`,
        request: 'launch',
        cwd: '${workspaceRoot}',
        args: [],
        MIMode: 'gdb',
        miDebuggerPath: debuggerPath,
        setupCommands: [
            {
                description: 'Enable pretty-printing for gdb',
                text: '-enable-pretty-printing',
                ignoreFailures: true,
            },
        ],
        program: target.path
    };
}
async function createLLDBDebugConfiguration(debuggerPath, target) {
    if (!await checkDebugger(debuggerPath)) {
        throw new Error(`Unable to find GDB in default search path and ${debuggerPath}.`);
    }
    return {
        type: 'cppdbg',
        name: `Debug ${target.name}`,
        request: 'launch',
        cwd: '${workspaceRoot}',
        args: [],
        MIMode: 'lldb',
        miDebuggerPath: debuggerPath,
        program: target.path
    };
}
function createMSVCDebugConfiguration(target) {
    return {
        type: 'cppvsdbg',
        name: `Debug ${target.name}`,
        request: 'launch',
        cwd: '${workspaceRoot}',
        args: [],
        program: target.path
    };
}
const DEBUG_GEN = {
    gdb: {
        miMode: 'gdb',
        createConfig: createGDBDebugConfiguration,
    },
    lldb: {
        miMode: 'lldb',
        createConfig: createLLDBDebugConfiguration,
    },
};
function searchForCompilerPathInCache(cache) {
    const languages = ['CXX', 'C', 'CUDA'];
    for (const lang of languages) {
        const entry = cache.get(`CMAKE_${lang}_COMPILER`);
        if (!entry) {
            continue;
        }
        return entry.value;
    }
    return null;
}
async function getDebugConfigurationFromCache(cache, target, platform) {
    const entry = cache.get('CMAKE_LINKER');
    if (entry !== null) {
        const linker = entry.value;
        const is_msvc_linker = linker.endsWith('link.exe');
        if (is_msvc_linker) {
            return createMSVCDebugConfiguration(target);
        }
    }
    const compiler_path = searchForCompilerPathInCache(cache);
    if (compiler_path === null) {
        throw Error('No compiler found in cache file.'); // MSVC should be already found by CMAKE_LINKER
    }
    const clang_compiler_regex = /(clang[\+]{0,2})+(?!-cl)/gi;
    // Look for lldb-mi
    let clang_debugger_path = compiler_path.replace(clang_compiler_regex, 'lldb-mi');
    if ((clang_debugger_path.search(new RegExp('lldb-mi')) != -1) && await checkDebugger(clang_debugger_path)) {
        return createLLDBDebugConfiguration(clang_debugger_path, target);
    }
    else {
        // Look for gdb
        clang_debugger_path = compiler_path.replace(clang_compiler_regex, 'gdb');
        if ((clang_debugger_path.search(new RegExp('gdb')) != -1) && await checkDebugger(clang_debugger_path)) {
            return createGDBDebugConfiguration(clang_debugger_path, target);
        }
        else {
            // Look for lldb
            clang_debugger_path = compiler_path.replace(clang_compiler_regex, 'lldb');
            if ((clang_debugger_path.search(new RegExp('lldb')) != -1) && await checkDebugger(clang_debugger_path)) {
                return createLLDBDebugConfiguration(clang_debugger_path, target);
            }
        }
    }
    const debugger_name = platform == 'darwin' ? 'lldb' : 'gdb';
    const description = DEBUG_GEN[debugger_name];
    const gcc_compiler_regex = /([cg]\+\+|g?cc)+/gi;
    const gdb_debugger_path = compiler_path.replace(gcc_compiler_regex, description.miMode);
    if (gdb_debugger_path.search(new RegExp(description.miMode)) != -1) {
        return description.createConfig(gdb_debugger_path, target);
    }
    const is_msvc_compiler = compiler_path.endsWith('cl.exe');
    if (is_msvc_compiler) {
        return createMSVCDebugConfiguration(target);
    }
    log.warning(`Unable to automatically determine debugger corresponding to compiler: ${compiler_path}`);
    return null;
}
exports.getDebugConfigurationFromCache = getDebugConfigurationFromCache;
async function checkDebugger(debuggerPath) {
    const res = await proc.execute(debuggerPath, ['--version'], null, { shell: true }).result;
    return res.retc == 0;
}
exports.checkDebugger = checkDebugger;
//# sourceMappingURL=debugger.js.map