"use strict";
const vscode = require("vscode");
const child_process = require("child_process");
const clang = require("./clang");
class ConfigurationTester {
    constructor() {
        this.processes = new Map();
    }
    test(language) {
        let [cmd, args] = clang.check(language);
        let proc = child_process.execFile(cmd, args, (error, stdout, stderr) => {
            if (error) {
                if (error.code === "ENOENT") {
                    vscode.window.showErrorMessage("Please install [clang](http://clang.llvm.org/) or check configuration `clang.executable`");
                }
                else {
                    vscode.window.showErrorMessage("Please check your configurations: " + stderr.toString().trim());
                }
            }
            this.processes.delete(proc.pid);
        });
        proc.stdin.end("int main() { return 0; }\n");
        this.processes.set(proc.pid, proc);
    }
    dispose() {
        for (let proc of Array.from(this.processes.values())) {
            proc.kill();
        }
    }
}
exports.ConfigurationTester = ConfigurationTester;
class ConfigurationViewer {
    constructor() {
        this.chan = vscode.window.createOutputChannel("Clang Configuration");
    }
    show(document) {
        let [command, args] = clang.command(document.languageId);
        this.chan.show();
        this.chan.clear();
        let buf = [];
        buf.push(`Executable: ${command}`);
        args.forEach((arg, i) => {
            buf.push(`Option ${i}: ${arg}`);
        });
        this.chan.appendLine(buf.join("\n"));
    }
    dispose() {
        this.chan.dispose();
    }
}
exports.ConfigurationViewer = ConfigurationViewer;
//# sourceMappingURL=configuration.js.map