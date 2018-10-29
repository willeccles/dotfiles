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
const vscode_1 = require("vscode");
const Commands = require("./Constants/commands");
const Logger = require("./Utils/Logger/logger");
class ClassPathManager {
    constructor(_projectManager) {
        this._projectManager = _projectManager;
        // mapping from project folder path to classpaths.
        this._classPathCache = new Map();
    }
    refresh(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vscode_1.workspace.workspaceFolders) {
                return;
            }
            yield this._projectManager.refresh();
            yield Promise.all(this._projectManager.getAll().map((info) => __awaiter(this, void 0, void 0, function* () {
                try {
                    this.storeClassPath(info.path, yield calculateClassPath(info.path));
                }
                catch (error) {
                    if (token && token.isCancellationRequested) {
                        return;
                    }
                    Logger.error(`Failed to refresh class path. Details: ${error}.`);
                    throw error;
                }
            })));
        });
    }
    dispose() {
        this._classPathCache.clear();
    }
    getClassPath(resource) {
        const path = this._projectManager.getProjectPath(resource);
        return this._classPathCache.has(path.fsPath) ? this._classPathCache.get(path.fsPath) : undefined;
    }
    getClassPaths(resources) {
        const set = new Set(resources.map((r) => this._projectManager.getProjectPath(r)).filter((p) => p && this._classPathCache.has(p.fsPath)));
        return [...set].map((p) => this._classPathCache.get(p.fsPath)).reduce((a, b) => a.concat(b), []);
    }
    storeClassPath(resource, classPath) {
        const path = this._projectManager.getProjectPath(resource);
        this._classPathCache.set(path.fsPath, classPath);
    }
}
exports.ClassPathManager = ClassPathManager;
function calculateClassPath(folder) {
    return Commands.executeJavaLanguageServerCommand(Commands.JAVA_CALCULATE_CLASS_PATH, folder.toString());
}
//# sourceMappingURL=classPathManager.js.map