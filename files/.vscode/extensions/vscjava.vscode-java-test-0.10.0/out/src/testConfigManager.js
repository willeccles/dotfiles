"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const vscode_1 = require("vscode");
const Configs = require("./Constants/configs");
const Logger = require("./Utils/Logger/logger");
class TestConfigManager {
    constructor(_projectManager) {
        this._projectManager = _projectManager;
        this._configPath = path.join('.vscode', Configs.TEST_LAUNCH_CONFIG_NAME);
    }
    get configPath() {
        return this._configPath;
    }
    loadConfig(tests) {
        return __awaiter(this, void 0, void 0, function* () {
            const folders = [...new Set(tests.map((t) => vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.parse(t.uri))).filter((t) => t))];
            return Promise.all(folders.map((f) => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const fullPath = yield this.createTestConfigIfNotExisted(f);
                fs.readFile(fullPath, 'utf-8', (readErr, data) => {
                    if (readErr) {
                        Logger.error(`Failed to read the test config! Details: ${readErr.message}.`, {
                            error: readErr,
                        }, true);
                        return reject(readErr);
                    }
                    try {
                        const config = JSON.parse(data);
                        resolve(config);
                    }
                    catch (ex) {
                        Logger.error(`Failed to parse the test config! Details: ${ex.message}.`, {
                            error: ex,
                        }, true);
                        reject(ex);
                    }
                });
            }))));
        });
    }
    editConfig() {
        if (!vscode_1.workspace.workspaceFolders) {
            throw new Error('Not supported without a folder!');
        }
        const editor = vscode_1.window.activeTextEditor;
        let folder = editor && vscode_1.workspace.getWorkspaceFolder(editor.document.uri);
        if (!folder) {
            Logger.warn(`Active file isn't within a folder, use first folder instead.`, undefined, true);
            folder = vscode_1.workspace.workspaceFolders[0];
        }
        return this.createTestConfigIfNotExisted(folder).then((fullPath) => {
            return vscode_1.workspace.openTextDocument(fullPath).then((doc) => {
                return vscode_1.window.showTextDocument(doc, editor ? editor.viewColumn : undefined);
            }, (err) => {
                return Promise.reject(err);
            });
        });
    }
    createTestConfigIfNotExisted(folder) {
        return this.withRetry(new Promise((resolve, reject) => {
            const configFullPath = path.join(folder.uri.fsPath, this._configPath);
            mkdirp(path.dirname(configFullPath), (merr) => {
                if (merr && merr.code !== 'EEXIST') {
                    Logger.error(`Failed to create sub directory for this config. Details: ${merr.message}.`, {
                        error: merr,
                    });
                    return reject(merr);
                }
                const config = this.createDefaultTestConfig(folder.uri);
                const content = JSON.stringify(config, null, 4);
                fs.writeFile(configFullPath, content, { flag: 'wx' }, (writeErr) => {
                    if (writeErr && writeErr.code !== 'EEXIST') {
                        Logger.error(`Failed to create default test config! Details: ${writeErr.message}.`, {
                            error: writeErr,
                        });
                        return reject(writeErr);
                    }
                    resolve(configFullPath);
                });
            });
        }), Configs.DISK_IO_RETRY_COUNT, Configs.DISK_IO_RETRY_DELAY_MILLISECONDS);
    }
    createDefaultTestConfig(folder) {
        const projects = this._projectManager.getProjects(folder);
        const config = {
            run: {
                default: '',
                items: projects.map((i) => {
                    return {
                        name: i.name,
                        projectName: i.name,
                        workingDirectory: i.path.fsPath,
                        args: [],
                        vmargs: [],
                        env: {},
                        preLaunchTask: '',
                    };
                }),
            },
            debug: {
                default: '',
                items: projects.map((i) => {
                    return {
                        name: i.name,
                        projectName: i.name,
                        workingDirectory: i.path.fsPath,
                        args: [],
                        vmargs: [],
                        env: {},
                        preLaunchTask: '',
                    };
                }),
            },
        };
        return config;
    }
    withRetry(request, retryTimes, retryDelayInMillisecond) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let count = 0;
            let error;
            while (count < retryTimes) {
                try {
                    const res = yield request;
                    resolve(res);
                    return;
                }
                catch (ex) {
                    error = ex;
                    yield new Promise((r) => {
                        setTimeout(() => {
                            r();
                        }, retryDelayInMillisecond);
                    });
                }
                finally {
                    count++;
                }
            }
            reject(error);
        }));
    }
}
exports.TestConfigManager = TestConfigManager;
//# sourceMappingURL=testConfigManager.js.map