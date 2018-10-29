"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
var Settings;
(function (Settings) {
    let External;
    (function (External) {
        function javaHome() {
            return vscode_1.workspace.getConfiguration("java").get("home");
        }
        External.javaHome = javaHome;
        function defaultWindowsShell() {
            return vscode_1.workspace.getConfiguration("terminal").get("integrated.shell.windows");
        }
        External.defaultWindowsShell = defaultWindowsShell;
    })(External = Settings.External || (Settings.External = {}));
    function excludedFolders(resource) {
        return _getMavenSection("excludedFolders", resource);
    }
    Settings.excludedFolders = excludedFolders;
    let Terminal;
    (function (Terminal) {
        function useJavaHome() {
            return _getMavenSection("terminal.useJavaHome");
        }
        Terminal.useJavaHome = useJavaHome;
        function customEnv() {
            return _getMavenSection("terminal.customEnv");
        }
        Terminal.customEnv = customEnv;
    })(Terminal = Settings.Terminal || (Settings.Terminal = {}));
    let Executable;
    (function (Executable) {
        function path(resource) {
            return _getMavenSection("executable.path", resource);
        }
        Executable.path = path;
        function options(resource) {
            return _getMavenSection("executable.options", resource);
        }
        Executable.options = options;
        function preferMavenWrapper(resource) {
            return _getMavenSection("executable.preferMavenWrapper", resource);
        }
        Executable.preferMavenWrapper = preferMavenWrapper;
    })(Executable = Settings.Executable || (Settings.Executable = {}));
    function _getMavenSection(section, resource) {
        return vscode_1.workspace.getConfiguration("maven", resource).get(section);
    }
})(Settings = exports.Settings || (exports.Settings = {}));
//# sourceMappingURL=Settings.js.map