"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const xml2js = require("xml2js");
const zlib = require("zlib");
const logging = require("./logging");
const pr_1 = require("./pr");
const util = require("./util");
const log = logging.createLogger('ctest');
function parseXMLString(xml) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err, result) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(result);
            }
        });
    });
}
function decodeOutputMeasurement(node) {
    if (typeof node === 'string') {
        return node;
    }
    let buffer = !!node.$.encoding ? new Buffer(node._, node.$.encoding) : new Buffer(node._, 'utf-8');
    if (!!node.$.compression) {
        buffer = zlib.unzipSync(buffer);
    }
    return buffer.toString('utf-8');
}
// clang-format on
function cleanupResultsXML(messy) {
    const testing_head = messy.Site.Testing[0];
    if (testing_head.TestList.length === 1 && testing_head.TestList[0] === '') {
        // XML parsing is obnoxious. This condition means that there are no tests,
        // but CTest is still enabled.
        return {
            Site: {
                $: messy.Site.$,
                Testing: {
                    TestList: [],
                    Test: [],
                }
            }
        };
    }
    return {
        Site: {
            $: messy.Site.$,
            Testing: {
                TestList: testing_head.TestList.map(l => l.Test[0]),
                Test: testing_head.Test.map((test) => ({
                    FullName: test.FullName[0],
                    FullCommandLine: test.FullCommandLine[0],
                    Name: test.Name[0],
                    Path: test.Path[0],
                    Status: test.$.Status,
                    Measurements: new Map(),
                    Output: decodeOutputMeasurement(test.Results[0].Measurement[0].Value[0]),
                }))
            }
        }
    };
}
async function readTestResultsFile(test_xml) {
    const content = (await pr_1.fs.readFile(test_xml)).toString();
    const data = await parseXMLString(content);
    const clean = cleanupResultsXML(data);
    return clean;
}
exports.readTestResultsFile = readTestResultsFile;
function parseCatchTestOutput(output) {
    const lines_with_ws = output.split('\n');
    const lines = lines_with_ws.map(l => l.trim());
    const decorations = [];
    for (let cursor = 0; cursor < lines.length; ++cursor) {
        const line = lines[cursor];
        const regex = process.platform === 'win32' ? /^(.*)\((\d+)\): FAILED:/ : /^(.*):(\d+): FAILED:/;
        const res = regex.exec(line);
        if (res) {
            const [_all, file, lineno_] = res;
            // tslint:disable-next-line
            void _all; // unused
            const lineno = parseInt(lineno_) - 1;
            let message = '~~~c++\n';
            for (let i = 0;; ++i) {
                const expr_line = lines_with_ws[cursor + i];
                if (expr_line.startsWith('======') || expr_line.startsWith('------')) {
                    break;
                }
                message += expr_line + '\n';
            }
            decorations.push({
                fileName: file,
                lineNumber: lineno,
                hoverMessage: `${message}\n~~~`,
            });
        }
    }
    return decorations;
}
exports.parseCatchTestOutput = parseCatchTestOutput;
async function parseTestOutput(output) {
    if (/is a Catch .* host application\./.test(output)) {
        return parseCatchTestOutput(output);
    }
    else {
        return [];
    }
}
exports.parseTestOutput = parseTestOutput;
class DecorationManager {
    constructor() {
        this._failingTestDecorationType = vscode.window.createTextEditorDecorationType({
            borderColor: 'rgba(255, 0, 0, 0.2)',
            borderWidth: '1px',
            borderRadius: '3px',
            borderStyle: 'solid',
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            overviewRulerColor: 'red',
            overviewRulerLane: vscode.OverviewRulerLane.Center,
            after: {
                contentText: 'Failed',
                backgroundColor: 'darkred',
                margin: '10px',
            },
        });
        this._binaryDir = '';
        this._showCoverageData = false;
        this._failingTestDecorations = [];
        vscode.window.onDidChangeActiveTextEditor(_ => { this._refreshActiveEditorDecorations(); });
    }
    get binaryDir() { return this._binaryDir; }
    set binaryDir(v) {
        this._binaryDir = v;
        this._refreshActiveEditorDecorations();
    }
    get showCoverageData() { return this._showCoverageData; }
    set showCoverageData(v) {
        this._showCoverageData = v;
        this._refreshAllEditorDecorations();
    }
    _refreshAllEditorDecorations() {
        for (const editor of vscode.window.visibleTextEditors) {
            this._refreshEditorDecorations(editor);
        }
    }
    _refreshActiveEditorDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            // Seems that sometimes the activeTextEditor is undefined. A VSCode bug?
            this._refreshEditorDecorations(editor);
        }
    }
    _refreshEditorDecorations(editor) {
        const fails_acc = [];
        const editor_file = util.lightNormalizePath(editor.document.fileName);
        for (const decor of this.failingTestDecorations) {
            const decor_file = util.lightNormalizePath(path.isAbsolute(decor.fileName) ? decor.fileName : path.join(this.binaryDir, decor.fileName));
            if (editor_file !== decor_file) {
                continue;
            }
            const file_line = editor.document.lineAt(decor.lineNumber);
            const range = new vscode.Range(decor.lineNumber, file_line.firstNonWhitespaceCharacterIndex, decor.lineNumber, file_line.range.end.character);
            fails_acc.push({
                hoverMessage: decor.hoverMessage,
                range,
            });
        }
        editor.setDecorations(this._failingTestDecorationType, fails_acc);
    }
    clearFailingTestDecorations() { this.failingTestDecorations = []; }
    addFailingTestDecoration(dec) {
        this._failingTestDecorations.push(dec);
        this._refreshActiveEditorDecorations();
    }
    get failingTestDecorations() { return this._failingTestDecorations; }
    set failingTestDecorations(v) {
        this._failingTestDecorations = v;
        this._refreshAllEditorDecorations();
    }
}
exports.DecorationManager = DecorationManager;
class CTestOutputLogger {
    output(line) { log.info(line); }
    error(line) { this.output(line); }
}
class CTestDriver {
    constructor(ws) {
        this.ws = ws;
        this._decorationManager = new DecorationManager();
        this._testingEnabled = false;
        this._testingEnabledEmitter = new vscode.EventEmitter();
        this.onTestingEnabledChanged = this._testingEnabledEmitter.event;
        /**
         * Holds the most recent test informations
         */
        this._tests = [];
        this._testsChangedEmitter = new vscode.EventEmitter();
        this.onTestsChanged = this._testsChangedEmitter.event;
        this._testResults = null;
        this._resultsChangedEmitter = new vscode.EventEmitter();
        this.onResultsChanged = this._resultsChangedEmitter.event;
    }
    get testingEnabled() { return this._testingEnabled; }
    set testingEnabled(v) {
        this._testingEnabled = v;
        this._testingEnabledEmitter.fire(v);
    }
    dispose() {
        this._testingEnabledEmitter.dispose();
        this._resultsChangedEmitter.dispose();
        this._testsChangedEmitter.dispose();
    }
    get tests() { return this._tests; }
    set tests(v) {
        this._tests = v;
        this._testsChangedEmitter.fire(v);
    }
    get testResults() { return this._testResults; }
    set testResults(v) {
        this._testResults = v;
        if (v) {
            const total = this.tests.length;
            const passing = v.Site.Testing.Test.reduce((acc, test) => acc + (test.Status === 'passed' ? 1 : 0), 0);
            this._resultsChangedEmitter.fire({ passing, total });
        }
        else {
            this._resultsChangedEmitter.fire(null);
        }
    }
    async runCTest(driver) {
        log.showChannel();
        this._decorationManager.clearFailingTestDecorations();
        const ctestpath = await this.ws.ctestPath;
        if (ctestpath === null) {
            log.info('CTest path is not set');
            return -2;
        }
        const configuration = driver.currentBuildType;
        const child = driver.executeCommand(ctestpath, [`-j${this.ws.config.numCTestJobs}`, '-C', configuration, '-T', 'test', '--output-on-failure'].concat(this.ws.config.ctestArgs), new CTestOutputLogger(), { environment: this.ws.config.testEnvironment, cwd: driver.binaryDir });
        const res = await child.result;
        await this.reloadTests(driver);
        if (res.retc === null) {
            log.info('CTest run was terminated');
            return -1;
        }
        else {
            log.info('CTest finished with return code', res.retc);
        }
        return res.retc;
    }
    /**
     * @brief Reload the list of CTest tests
     */
    async reloadTests(driver) {
        const ctest_file = path.join(driver.binaryDir, 'CTestTestfile.cmake');
        if (!(await pr_1.fs.exists(ctest_file))) {
            this.testingEnabled = false;
            return this.tests = [];
        }
        this._decorationManager.binaryDir = driver.binaryDir;
        this.testingEnabled = true;
        const ctestpath = await this.ws.ctestPath;
        if (ctestpath === null) {
            log.info('CTest path is not set');
            return this.tests = [];
        }
        const build_config = driver.currentBuildType;
        const result = await driver
            .executeCommand(ctestpath, ['-N', '-C', build_config], undefined, { cwd: driver.binaryDir, silent: true })
            .result;
        if (result.retc !== 0) {
            // There was an error running CTest. Odd...
            log.error('There was an error running ctest to determine available test executables');
            return this.tests = [];
        }
        const tests = result.stdout.split('\n')
            .map(l => l.trim())
            .filter(l => /^Test\s*#(\d+):\s(.*)/.test(l))
            .map(l => /^Test\s*#(\d+):\s(.*)/.exec(l))
            .map(([_, id, tname]) => ({ id: parseInt(id), name: tname }));
        const tagfile = path.join(driver.binaryDir, 'Testing', 'TAG');
        const tag = (await pr_1.fs.exists(tagfile)) ? (await pr_1.fs.readFile(tagfile)).toString().split('\n')[0].trim() : null;
        const tagdir = tag ? path.join(driver.binaryDir, 'Testing', tag) : null;
        const results_file = tagdir ? path.join(tagdir, 'Test.xml') : null;
        this.tests = tests;
        if (results_file && await pr_1.fs.exists(results_file)) {
            console.assert(tagdir);
            await this._reloadTestResults(driver.sourceDir, tagdir, results_file);
        }
        else {
            this.testResults = null;
        }
        return tests;
    }
    async _reloadTestResults(_sourceDir, _tagdir, test_xml) {
        this.testResults = await readTestResultsFile(test_xml);
        const failing = this.testResults.Site.Testing.Test.filter(t => t.Status === 'failed');
        this._decorationManager.clearFailingTestDecorations();
        const new_decors = [];
        for (const t of failing) {
            new_decors.push(...await parseTestOutput(t.Output));
        }
        this._decorationManager.failingTestDecorations = new_decors;
    }
}
exports.CTestDriver = CTestDriver;
//# sourceMappingURL=ctest.js.map