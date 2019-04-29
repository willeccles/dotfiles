"use strict";
/**
 * A module for doing very primitive dirty-checking
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const pr_1 = require("@cmt/pr");
const util = require("@cmt/util");
const path = require("path");
class InputFile {
    constructor(filePath, mtime) {
        this.filePath = filePath;
        this.mtime = mtime;
    }
    async checkOutOfDate() {
        if (this.mtime === null) {
            return true;
        }
        let stat;
        try {
            stat = await pr_1.fs.stat(this.filePath);
        }
        catch (_) {
            // Failed to stat: Treat the file as out-of-date
            return true;
        }
        return stat.mtime.valueOf() > this.mtime.valueOf();
    }
    static async create(filePath) {
        let stat;
        try {
            stat = await pr_1.fs.stat(filePath);
        }
        catch (_) {
            return new InputFile(filePath, null);
        }
        return new InputFile(filePath, stat.mtime);
    }
}
exports.InputFile = InputFile;
class InputFileSet {
    constructor(inputFiles) {
        this.inputFiles = inputFiles;
    }
    async checkOutOfDate() {
        for (const input of this.inputFiles) {
            if (await input.checkOutOfDate()) {
                return true;
            }
        }
        return false;
    }
    static async create(cmake_inputs) {
        const input_files = await Promise.all(util.map(util.flatMap(cmake_inputs.buildFiles, entry => entry.sources), src => {
            // Map input file paths to files relative to the source directory
            if (!path.isAbsolute(src)) {
                src = util.platformNormalizePath(path.join(cmake_inputs.sourceDirectory, src));
            }
            return InputFile.create(src);
        }));
        return new InputFileSet(input_files);
    }
    static createEmpty() {
        return new InputFileSet([]);
    }
}
exports.InputFileSet = InputFileSet;
//# sourceMappingURL=dirty.js.map