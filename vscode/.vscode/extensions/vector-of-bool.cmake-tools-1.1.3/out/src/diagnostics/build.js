"use strict";
/**
 * Module for handling build diagnostics (from the compiler/linker)
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("@cmt/util");
const vscode = require("vscode");
const gcc = require("./gcc");
const ghs = require("./ghs");
const gnu_ld = require("./gnu-ld");
const mvsc = require("./msvc");
class CompileOutputConsumer {
    constructor() {
        this.gcc = new gcc.Parser();
        this.ghs = new ghs.Parser();
        this.gnuLD = new gnu_ld.Parser();
        this.msvc = new mvsc.Parser();
    }
    // Defer all output to the `error` method
    output(line) { this.error(line); }
    error(line) {
        for (const cand of [this.gcc, this.ghs, this.msvc, this.gnuLD]) {
            if (cand.handleLine(line)) {
                break;
            }
        }
    }
    resolveDiagnostics(basePath) {
        const diags_by_file = new Map();
        const severity_of = (p) => {
            switch (p) {
                case 'warning':
                    return vscode.DiagnosticSeverity.Warning;
                case 'fatal error':
                case 'error':
                    return vscode.DiagnosticSeverity.Error;
                case 'note':
                case 'info':
                case 'remark':
                    return vscode.DiagnosticSeverity.Information;
            }
            throw new Error('Unknown diagnostic severity level: ' + p);
        };
        const by_source = {
            GCC: this.gcc.diagnostics,
            MSVC: this.msvc.diagnostics,
            GHS: this.ghs.diagnostics,
            link: this.gnuLD.diagnostics,
        };
        const arrs = util.objectPairs(by_source).map(([source, diags]) => {
            return diags.map(raw_diag => {
                const filepath = util.resolvePath(raw_diag.file, basePath);
                const diag = new vscode.Diagnostic(raw_diag.location, raw_diag.message, severity_of(raw_diag.severity));
                diag.source = source;
                if (raw_diag.code) {
                    diag.code = raw_diag.code;
                }
                if (!diags_by_file.has(filepath)) {
                    diags_by_file.set(filepath, []);
                }
                diag.relatedInformation = [];
                for (const rel of raw_diag.related) {
                    const relFilePath = vscode.Uri.file(util.resolvePath(rel.file, basePath));
                    const related = new vscode.DiagnosticRelatedInformation(new vscode.Location(relFilePath, rel.location), rel.message);
                    diag.relatedInformation.push(related);
                }
                diags_by_file.get(filepath).push(diag);
                return {
                    filepath,
                    diag,
                };
            });
        });
        return [].concat(...arrs);
    }
}
exports.CompileOutputConsumer = CompileOutputConsumer;
/**
 * Class which consumes the output of a running build.
 *
 * This parses compiler errors, but also emits progress events when the build
 * tool writes a status message which can be parsed as containing a progress
 * indicator.
 */
class CMakeBuildConsumer {
    constructor(logger) {
        this.logger = logger;
        this._onProgressEmitter = new vscode.EventEmitter();
        this._percent_re = /\[.*?(\d+)\%.*?\]/;
        this.compileConsumer = new CompileOutputConsumer();
    }
    /**
     * Event fired when the progress changes
     */
    get onProgress() { return this._onProgressEmitter.event; }
    dispose() { this._onProgressEmitter.dispose(); }
    error(line) {
        this.compileConsumer.error(line);
        if (this.logger) {
            this.logger.error(line);
        }
    }
    output(line) {
        this.compileConsumer.output(line);
        if (this.logger) {
            this.logger.info(line);
        }
        const progress = this._percent_re.exec(line);
        if (progress) {
            const percent = progress[1];
            this._onProgressEmitter.fire({
                minimum: 0,
                maximum: 100,
                value: Number.parseInt(percent),
            });
        }
    }
}
exports.CMakeBuildConsumer = CMakeBuildConsumer;
//# sourceMappingURL=build.js.map