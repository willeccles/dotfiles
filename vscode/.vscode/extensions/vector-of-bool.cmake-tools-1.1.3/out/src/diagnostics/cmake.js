"use strict";
/**
 * Parsing of CMake configure diagnostics
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("@cmt/util");
const vscode = require("vscode");
const util_1 = require("./util");
/**
 * Class which consumes output from CMake.
 *
 * This class is in charge of logging CMake's output, as well as parsing and
 * collecting warnings and errors from the configure step. It should be used
 * in conjunction with `proc.execute`.
 */
class CMakeOutputConsumer {
    constructor(sourceDir, logger) {
        this.sourceDir = sourceDir;
        this.logger = logger;
        this._diagnostics = [];
        /**
         * The state for the diagnostic parser. Implemented as a crude FSM
         */
        this._errorState = {
            state: 'init',
            diag: null,
            blankLines: 0,
        };
    }
    /**
     * The diagnostics that this consumer has accumulated. It will be populated
     * during calls to `output()` and `error()`
     */
    get diagnostics() { return this._diagnostics; }
    /**
     * Simply writes the line of output to the log
     * @param line Line of output
     */
    output(line) {
        if (this.logger) {
            this.logger.info(line);
        }
        this._parseDiags(line);
    }
    /**
     * Consume a line of stderr.
     * @param line The line from stderr
     */
    error(line) {
        // First, just log the line
        if (this.logger) {
            this.logger.error(line);
        }
        this._parseDiags(line);
    }
    _parseDiags(line) {
        // This line of output terminates an `AUTHOR_WARNING`
        const dev_warning_re = /^This warning is for project developers\./;
        // Switch on the state to implement our crude FSM
        switch (this._errorState.state) {
            case 'init': {
                const re = /CMake (.*?)(?: \(dev\))? at (.*?):(\d+) \((.*?)\):/;
                const result = re.exec(line);
                if (result) {
                    // We have encountered and error
                    const [_full, level, filename, linestr, command] = result;
                    // tslint:disable-next-line
                    _full; // unused
                    const lineno = util_1.oneLess(linestr);
                    const diagmap = {
                        Warning: vscode.DiagnosticSeverity.Warning,
                        Error: vscode.DiagnosticSeverity.Error,
                    };
                    const vsdiag = new vscode.Diagnostic(new vscode.Range(lineno, 0, lineno, 9999), '', diagmap[level]);
                    vsdiag.source = `CMake (${command})`;
                    vsdiag.relatedInformation = [];
                    const filepath = util.resolvePath(filename, this.sourceDir);
                    this._errorState.diag = {
                        filepath,
                        diag: vsdiag,
                    };
                    this._errorState.state = 'diag';
                    this._errorState.blankLines = 0;
                }
                break;
            }
            case 'diag': {
                console.assert(this._errorState.diag, 'No diagnostic?');
                const call_stack_re = /^Call Stack \(most recent call first\):$/;
                if (call_stack_re.test(line)) {
                    // We're in call stack mode!
                    this._errorState.state = 'stack';
                    this._errorState.blankLines = 0;
                    break;
                }
                if (line == '') {
                    // A blank line!
                    if (this._errorState.blankLines == 0) {
                        // First blank. Okay
                        this._errorState.blankLines++;
                        this._errorState.diag.diag.message += '\n';
                    }
                    else {
                        // Second blank line. Now we commit the diagnostic.
                        this._commitDiag();
                    }
                }
                else if (dev_warning_re.test(line)) {
                    this._commitDiag();
                }
                else {
                    // Reset blank line count
                    this._errorState.blankLines = 0;
                    // Add this line to the current diag accumulator
                    const trimmed = line.replace(/^  /, '');
                    this._errorState.diag.diag.message += trimmed + '\n';
                }
                break;
            }
            case 'stack': {
                // Meh... vscode doesn't really let us provide call stacks to diagnostics.
                // We can't really do anything...
                if (line.trim() == '') {
                    if (this._errorState.blankLines == 1) {
                        this._commitDiag();
                    }
                    else {
                        this._errorState.blankLines++;
                    }
                }
                else if (dev_warning_re.test(line)) {
                    this._commitDiag();
                }
                else {
                    const stackElemRe = /^  (.*):(\d+) \((\w+)\)$/;
                    const mat = stackElemRe.exec(line);
                    if (mat) {
                        const [, filepath, lineNoStr, command] = mat;
                        const fileUri = vscode.Uri.file(util.resolvePath(filepath, this.sourceDir));
                        const lineNo = parseInt(lineNoStr) - 1;
                        const related = new vscode.DiagnosticRelatedInformation(new vscode.Location(fileUri, new vscode.Range(lineNo, 0, lineNo, 999)), `In call to '${command}' here`);
                        console.assert(this._errorState.diag);
                        this._errorState.diag.diag.relatedInformation.push(related);
                    }
                }
                break;
            }
        }
    }
    /**
     * Commit the accumulated diagnostic and go back to `init` state.
     */
    _commitDiag() {
        const diag = this._errorState.diag;
        // Remove the final newline(s) from the message, for prettiness
        diag.diag.message = diag.diag.message.replace(/\n+$/, '');
        this._diagnostics.push(this._errorState.diag);
        this._errorState.diag = null;
        this._errorState.blankLines = 0;
        this._errorState.state = 'init';
    }
}
exports.CMakeOutputConsumer = CMakeOutputConsumer;
//# sourceMappingURL=cmake.js.map