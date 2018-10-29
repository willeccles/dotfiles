"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const archiver = require("archiver");
const fileUrl = require("file-url");
const fs = require("fs");
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");
const Configs = require("../Constants/configs");
const Logger = require("./Logger/logger");
class ClassPathUtility {
    static getClassPathStr(classpaths, separator, tmpStoragePath) {
        const concated = classpaths.join(separator);
        if (concated.length <= Configs.MAX_CLASS_PATH_LENGTH) {
            return Promise.resolve(concated);
        }
        return ClassPathUtility.generateClassPathFile(classpaths, tmpStoragePath);
    }
    /*
     * solve the issue that long class path cannot be processed by child process
     */
    static generateClassPathFile(classpaths, tmpStoragePath) {
        const tempFile = path.join(tmpStoragePath, 'path.jar');
        return new Promise((resolve, reject) => {
            mkdirp(path.dirname(tempFile), (err) => {
                if (err && err.code !== 'EEXIST') {
                    Logger.error(`Failed to create sub directory for this run.`, {
                        error: err,
                    });
                    reject(err);
                }
                const output = fs.createWriteStream(tempFile);
                output.on('close', () => {
                    resolve(tempFile);
                });
                const jarfile = archiver('zip');
                jarfile.on('error', (jarErr) => {
                    Logger.error(`Failed to process too long class path issue. Error: ${err}`, {
                        error: err,
                    });
                    reject(jarErr);
                });
                // pipe archive data to the file
                jarfile.pipe(output);
                jarfile.append(this.constructManifestFile(classpaths), { name: 'META-INF/MANIFEST.MF' });
                jarfile.finalize();
            });
        });
    }
    static constructManifestFile(classpaths) {
        let content = '';
        const extended = ['Class-Path:', ...classpaths.map((c) => {
                const p = fileUrl(c);
                return p.endsWith('.jar') ? p : p + '/';
            })];
        content += extended.join(` ${os.EOL} `);
        content += os.EOL;
        return content;
    }
}
exports.ClassPathUtility = ClassPathUtility;
//# sourceMappingURL=classPathUtility.js.map