"use strict";
/**
 * This module promise-ifies some NodeJS APIs that are frequently used in this
 * ext.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const promisify_ = require("es6-promisify");
// VSCode doesn't ship with util.promisify yet, but we do have type definitions for it, so we'll
// hack those type definitions onto the type of es6-promisify >:)
const promisify = promisify_;
const fs_ = require("fs");
const path = require("path");
const rimraf = require("rimraf");
/**
 * Wrappers for the `fs` module.
 *
 * Also has a few utility functions
 */
var fs;
(function (fs) {
    function exists(fspath) {
        return new Promise((resolve, _reject) => { fs_.exists(fspath, res => resolve(res)); });
    }
    fs.exists = exists;
    fs.readFile = promisify(fs_.readFile);
    fs.writeFile = promisify(fs_.writeFile);
    fs.readdir = promisify(fs_.readdir);
    fs.mkdir = promisify(fs_.mkdir);
    fs.mkdtemp = promisify(fs_.mkdtemp);
    fs.rename = promisify(fs_.rename);
    fs.stat = promisify(fs_.stat);
    /**
     * Try and stat() a file. If stat() fails for *any reason*, returns `null`.
     * @param filePath The file to try and stat()
     */
    async function tryStat(filePath) {
        try {
            return await fs.stat(filePath);
        }
        catch (_e) {
            // Don't even bother with the error. Any number of things might have gone
            // wrong. Probably one of: Non-existing file, bad permissions, bad path.
            return null;
        }
    }
    fs.tryStat = tryStat;
    fs.readlink = promisify(fs_.readlink);
    fs.unlink = promisify(fs_.unlink);
    fs.appendFile = promisify(fs_.appendFile);
    /**
     * Creates a directory and all parent directories recursively. If the file
     * already exists, and is not a directory, just return.
     * @param fspath The directory to create
     */
    async function mkdir_p(fspath) {
        const parent = path.dirname(fspath);
        if (!await exists(parent)) {
            await mkdir_p(parent);
        }
        else {
            if (!(await fs.stat(parent)).isDirectory()) {
                throw new Error('Cannot create ${fspath}: ${parent} is a non-directory');
            }
        }
        if (!await exists(fspath)) {
            await fs.mkdir(fspath);
        }
        else {
            if (!(await fs.stat(fspath)).isDirectory()) {
                throw new Error('Cannot mkdir_p on ${fspath}. It exists, and is not a directory!');
            }
        }
    }
    fs.mkdir_p = mkdir_p;
    /**
     * Copy a file from one location to another.
     * @param inpath The input file
     * @param outpath The output file
     */
    function copyFile(inpath, outpath) {
        return new Promise((resolve, reject) => {
            const reader = fs_.createReadStream(inpath);
            reader.on('error', e => reject(e));
            reader.on('open', _fd => {
                const writer = fs_.createWriteStream(outpath);
                writer.on('error', e => reject(e));
                writer.on('open', _fd2 => { reader.pipe(writer); });
                writer.on('close', () => resolve());
            });
        });
    }
    fs.copyFile = copyFile;
    /**
     * Create a hard link of an existing file
     * @param inPath The existing file path
     * @param outPath The new path to the hard link
     */
    function hardLinkFile(inPath, outPath) {
        return new Promise((resolve, reject) => {
            fs_.link(inPath, outPath, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    fs.hardLinkFile = hardLinkFile;
    /**
     * Remove a directory recursively. **DANGER DANGER!**
     * @param dirpath Directory to remove
     */
    function rmdir(dirpath) {
        return new Promise((resolve, reject) => {
            rimraf(dirpath, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    fs.rmdir = rmdir;
})(fs = exports.fs || (exports.fs = {}));
//# sourceMappingURL=pr.js.map