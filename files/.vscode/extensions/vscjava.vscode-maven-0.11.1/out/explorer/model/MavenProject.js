"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
class MavenProject {
    get name() {
        let ret;
        try {
            ret = this._pom.project.artifactId[0];
        }
        catch (error) {
            // ignore it
        }
        return ret;
    }
    get modules() {
        let ret = [];
        try {
            ret = this._pom.project.modules[0].module;
        }
        catch (error) {
            // ignore it
        }
        return ret;
    }
    constructor(pom) {
        this._pom = pom;
    }
}
exports.MavenProject = MavenProject;
//# sourceMappingURL=MavenProject.js.map