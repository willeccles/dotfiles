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
const path = require("path");
const vscode_1 = require("vscode");
const Commands = require("./Constants/commands");
const Logger = require("./Utils/Logger/logger");
class ProjectManager {
    constructor() {
        // mapping from workspace folder uri to projects.
        this.projectInfos = new Map();
    }
    refresh(token) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vscode_1.workspace.workspaceFolders) {
                return;
            }
            yield Promise.all(vscode_1.workspace.workspaceFolders.map((workspaceFolder) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const infos = yield this.getProjectInfo(workspaceFolder.uri);
                    for (const info of infos) {
                        info.path = vscode_1.Uri.parse(info.path.toString());
                    }
                    this.storeProjects(workspaceFolder.uri, infos);
                }
                catch (error) {
                    if (token && token.isCancellationRequested) {
                        return;
                    }
                    Logger.error(`Failed to refresh project mapping. Details: ${error}.`);
                    throw error;
                }
            })));
        });
    }
    storeProjects(wkspace, infos) {
        this.projectInfos.set(wkspace.fsPath, infos);
    }
    getProjects(wkspace) {
        return this.projectInfos.has(wkspace.fsPath) ? this.projectInfos.get(wkspace.fsPath) : [];
    }
    getAll() {
        return [...this.projectInfos.values()].reduce((a, b) => a.concat(b), []);
    }
    getProject(file) {
        const fpath = this.formatPath(file.fsPath);
        const matched = this.getAll()
            .filter((p) => fpath.startsWith(this.formatPath(p.path.fsPath)))
            .sort((a, b) => (a.path.fsPath < b.path.fsPath ? 1 : -1));
        if (matched.length === 0) {
            Logger.error(`Failed to get the project.`);
            return undefined;
        }
        if (matched.length > 1) {
            Logger.warn(`Found multiple projects: ${matched.map((m) => m.name)}`);
        }
        return matched[0];
    }
    getProjectName(file) {
        const project = this.getProject(file);
        return project && project.name;
    }
    getProjectPath(file) {
        const project = this.getProject(file);
        return project && project.path;
    }
    formatPath(p) {
        if (!p) {
            return p;
        }
        let formatted = path.normalize(p).toLowerCase().replace(/\\/g, '/');
        if (!formatted.endsWith('/')) {
            formatted += '/';
        }
        return formatted;
    }
    getProjectInfo(folder) {
        return Commands.executeJavaLanguageServerCommand(Commands.JAVA_GET_PROJECT_INFO, folder.toString());
    }
}
exports.ProjectManager = ProjectManager;
//# sourceMappingURL=projectManager.js.map