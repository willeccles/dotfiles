"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shlex = require("@cmt/shlex");
const logging_1 = require("./logging");
const pr_1 = require("./pr");
const util = require("./util");
const log = logging_1.createLogger('compdb');
class CompilationDatabase {
    constructor(infos) {
        this._infoByFilePath = infos.reduce((acc, cur) => acc.set(util.platformNormalizePath(cur.file), {
            directory: cur.directory,
            file: cur.file,
            output: cur.output,
            arguments: 'arguments' in cur ? cur.arguments : [...shlex.split(cur.command)],
        }), new Map());
    }
    get(fspath) { return this._infoByFilePath.get(util.platformNormalizePath(fspath)); }
    static async fromFilePath(dbpath) {
        if (!await pr_1.fs.exists(dbpath)) {
            return null;
        }
        const data = await pr_1.fs.readFile(dbpath);
        try {
            const content = JSON.parse(data.toString());
            return new CompilationDatabase(content);
        }
        catch (e) {
            log.warning(`Error parsing compilation database "${dbpath}": ${e}`);
            return null;
        }
    }
}
exports.CompilationDatabase = CompilationDatabase;
//# sourceMappingURL=compdb.js.map