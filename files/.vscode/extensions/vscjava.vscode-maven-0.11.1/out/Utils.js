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
const child_process = require("child_process");
const fse = require("fs-extra");
const http = require("http");
const https = require("https");
const md5 = require("md5");
const os = require("os");
const path = require("path");
const url = require("url");
const vscode_1 = require("vscode");
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const xml2js = require("xml2js");
const Settings_1 = require("./Settings");
const VSCodeUI_1 = require("./VSCodeUI");
var Utils;
(function (Utils) {
    let EXTENSION_PUBLISHER;
    let EXTENSION_NAME;
    let EXTENSION_VERSION;
    let EXTENSION_AI_KEY;
    function loadPackageInfo(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { publisher, name, version, aiKey } = yield fse.readJSON(context.asAbsolutePath("./package.json"));
            EXTENSION_AI_KEY = aiKey;
            EXTENSION_PUBLISHER = publisher;
            EXTENSION_NAME = name;
            EXTENSION_VERSION = version;
        });
    }
    Utils.loadPackageInfo = loadPackageInfo;
    function getExtensionPublisher() {
        return EXTENSION_PUBLISHER;
    }
    Utils.getExtensionPublisher = getExtensionPublisher;
    function getExtensionName() {
        return EXTENSION_NAME;
    }
    Utils.getExtensionName = getExtensionName;
    function getExtensionId() {
        return `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
    }
    Utils.getExtensionId = getExtensionId;
    function getExtensionVersion() {
        return EXTENSION_VERSION;
    }
    Utils.getExtensionVersion = getExtensionVersion;
    function getAiKey() {
        return EXTENSION_AI_KEY;
    }
    Utils.getAiKey = getAiKey;
    function getTempFolder() {
        return path.join(os.tmpdir(), getExtensionId());
    }
    Utils.getTempFolder = getTempFolder;
    function getPathToExtensionRoot(...args) {
        return path.join(vscode_1.extensions.getExtension(getExtensionId()).extensionPath, ...args);
    }
    Utils.getPathToExtensionRoot = getPathToExtensionRoot;
    function parseXmlFile(xmlFilePath, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield fse.pathExists(xmlFilePath)) {
                const xmlString = yield fse.readFile(xmlFilePath, "utf8");
                return parseXmlContent(xmlString, options);
            }
            else {
                return null;
            }
        });
    }
    Utils.parseXmlFile = parseXmlFile;
    function parseXmlContent(xmlString, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const opts = Object.assign({ explicitArray: true }, options);
            return new Promise((resolve, reject) => {
                xml2js.parseString(xmlString, opts, (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        });
    }
    Utils.parseXmlContent = parseXmlContent;
    function getEffectivePomOutputPath(pomXmlFilePath) {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "effective-pom.xml");
    }
    Utils.getEffectivePomOutputPath = getEffectivePomOutputPath;
    function getCommandHistoryCachePath(pomXmlFilePath) {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "commandHistory.json");
    }
    Utils.getCommandHistoryCachePath = getCommandHistoryCachePath;
    function readFileIfExists(filepath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield fse.pathExists(filepath)) {
                return (yield fse.readFile(filepath)).toString();
            }
            return null;
        });
    }
    Utils.readFileIfExists = readFileIfExists;
    function downloadFile(targetUrl, readContent, customHeaders) {
        return __awaiter(this, void 0, void 0, function* () {
            const tempFilePath = path.join(getTempFolder(), md5(targetUrl));
            yield fse.ensureDir(getTempFolder());
            if (yield fse.pathExists(tempFilePath)) {
                yield fse.remove(tempFilePath);
            }
            return yield new Promise((resolve, reject) => {
                const urlObj = url.parse(targetUrl);
                const options = Object.assign({ headers: Object.assign({}, customHeaders, { 'User-Agent': `vscode/${getExtensionVersion()}` }) }, urlObj);
                let client;
                if (urlObj.protocol === "https:") {
                    client = https;
                    // tslint:disable-next-line:no-http-string
                }
                else if (urlObj.protocol === "http:") {
                    client = http;
                }
                else {
                    return reject(new Error("Unsupported protocol."));
                }
                client.get(options, (res) => {
                    let rawData;
                    let ws;
                    if (readContent) {
                        rawData = "";
                    }
                    else {
                        ws = fse.createWriteStream(tempFilePath);
                    }
                    res.on('data', (chunk) => {
                        if (readContent) {
                            rawData += chunk;
                        }
                        else {
                            ws.write(chunk);
                        }
                    });
                    res.on('end', () => {
                        if (readContent) {
                            resolve(rawData);
                        }
                        else {
                            ws.end();
                            resolve(tempFilePath);
                        }
                    });
                }).on("error", (err) => {
                    reject(err);
                });
            });
        });
    }
    Utils.downloadFile = downloadFile;
    function getMaven(workspaceFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!workspaceFolder) {
                return Settings_1.Settings.Executable.path(null) || "mvn";
            }
            const executablePathInConf = Settings_1.Settings.Executable.path(workspaceFolder.uri);
            const preferMavenWrapper = Settings_1.Settings.Executable.preferMavenWrapper(workspaceFolder.uri);
            if (!executablePathInConf) {
                const mvnwPathWithoutExt = path.join(workspaceFolder.uri.fsPath, "mvnw");
                if (preferMavenWrapper && (yield fse.pathExists(mvnwPathWithoutExt))) {
                    return mvnwPathWithoutExt;
                }
                else {
                    return "mvn";
                }
            }
            else {
                return path.resolve(workspaceFolder.uri.fsPath, executablePathInConf);
            }
        });
    }
    function wrappedWithQuotes(mvn) {
        if (mvn === "mvn") {
            return mvn;
        }
        else {
            return `"${mvn}"`;
        }
    }
    function executeInTerminal(command, pomfile, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const workspaceFolder = pomfile && vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(pomfile));
            const mvnString = wrappedWithQuotes(formattedPathForTerminal(yield getMaven(workspaceFolder)));
            const fullCommand = [
                mvnString,
                command.trim(),
                pomfile && `-f "${formattedPathForTerminal(pomfile)}"`,
                Settings_1.Settings.Executable.options(pomfile && vscode_1.Uri.file(pomfile))
            ].filter(Boolean).join(" ");
            const name = workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven";
            VSCodeUI_1.VSCodeUI.mavenTerminal.runInTerminal(fullCommand, Object.assign({ name }, options));
            if (pomfile) {
                updateLRUCommands(command, pomfile);
            }
        });
    }
    Utils.executeInTerminal = executeInTerminal;
    function executeInBackground(command, pomfile, workspaceFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!workspaceFolder) {
                workspaceFolder = pomfile && vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(pomfile));
            }
            const mvnExecutable = yield getMaven(workspaceFolder);
            const mvnString = wrappedWithQuotes(mvnExecutable);
            const commandCwd = path.resolve(workspaceFolder.uri.fsPath, mvnExecutable, "..");
            const fullCommand = [
                mvnString,
                command.trim(),
                pomfile && `-f "${pomfile}"`,
                Settings_1.Settings.Executable.options(pomfile && vscode_1.Uri.file(pomfile))
            ].filter(Boolean).join(" ");
            const customEnv = VSCodeUI_1.VSCodeUI.setupEnvironment();
            const execOptions = {
                cwd: commandCwd,
                env: Object.assign({}, process.env, customEnv)
            };
            return new Promise((resolve, reject) => {
                VSCodeUI_1.VSCodeUI.outputChannel.appendLine(fullCommand, "Background Command");
                child_process.exec(fullCommand, execOptions, (error, stdout, _stderr) => {
                    if (error) {
                        VSCodeUI_1.VSCodeUI.outputChannel.appendLine(error);
                        reject(error);
                    }
                    else {
                        resolve({ stdout });
                    }
                });
            });
        });
    }
    Utils.executeInBackground = executeInBackground;
    function getLRUCommands(pomPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const filepath = getCommandHistoryCachePath(pomPath);
            if (yield fse.pathExists(filepath)) {
                const content = (yield fse.readFile(filepath)).toString();
                let historyObject;
                try {
                    historyObject = JSON.parse(content);
                }
                catch (error) {
                    historyObject = { pomPath, timestamps: {} };
                }
                const timestamps = historyObject.timestamps;
                const commandList = Object.keys(timestamps).sort((a, b) => timestamps[b] - timestamps[a]);
                return commandList.map(command => Object.assign({ command, pomPath, timestamp: timestamps[command] }));
            }
            return [];
        });
    }
    Utils.getLRUCommands = getLRUCommands;
    function updateLRUCommands(command, pomPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const historyFilePath = getCommandHistoryCachePath(pomPath);
            yield fse.ensureFile(historyFilePath);
            const content = (yield fse.readFile(historyFilePath)).toString();
            let historyObject;
            try {
                historyObject = JSON.parse(content);
                historyObject.pomPath = pomPath;
            }
            catch (error) {
                historyObject = { pomPath, timestamps: {} };
            }
            finally {
                historyObject.timestamps[command] = Date.now();
            }
            yield fse.writeFile(historyFilePath, JSON.stringify(historyObject));
        });
    }
    function currentWindowsShell() {
        const is32ProcessOn64Windows = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
        const system32Path = `${process.env.windir}\\${is32ProcessOn64Windows ? 'Sysnative' : 'System32'}`;
        const expectedLocations = {
            'Command Prompt': [`${system32Path}\\cmd.exe`],
            PowerShell: [`${system32Path}\\WindowsPowerShell\\v1.0\\powershell.exe`],
            'WSL Bash': [`${system32Path}\\bash.exe`],
            'Git Bash': [
                `${process.env.ProgramW6432}\\Git\\bin\\bash.exe`,
                `${process.env.ProgramW6432}\\Git\\usr\\bin\\bash.exe`,
                `${process.env.ProgramFiles}\\Git\\bin\\bash.exe`,
                `${process.env.ProgramFiles}\\Git\\usr\\bin\\bash.exe`,
                `${process.env.LocalAppData}\\Programs\\Git\\bin\\bash.exe`
            ]
        };
        const currentWindowsShellPath = Settings_1.Settings.External.defaultWindowsShell();
        for (const key in expectedLocations) {
            if (expectedLocations[key].indexOf(currentWindowsShellPath) >= 0) {
                return key;
            }
        }
        return 'Others';
    }
    Utils.currentWindowsShell = currentWindowsShell;
    function toWSLPath(p) {
        const arr = p.split(":\\");
        if (arr.length === 2) {
            const drive = arr[0].toLowerCase();
            const dir = arr[1].replace(/\\/g, "/");
            return `/mnt/${drive}/${dir}`;
        }
        else {
            return ".";
        }
    }
    Utils.toWSLPath = toWSLPath;
    function formattedPathForTerminal(filepath) {
        if (process.platform === "win32") {
            switch (currentWindowsShell()) {
                case "WSL Bash":
                    return toWSLPath(filepath);
                default:
                    return filepath;
            }
        }
        else {
            return filepath;
        }
    }
    Utils.formattedPathForTerminal = formattedPathForTerminal;
    function getResourcePath(...args) {
        return path.join(__filename, "..", "..", "resources", ...args);
    }
    Utils.getResourcePath = getResourcePath;
    function getAllPomPaths(workspaceFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            const exclusions = Settings_1.Settings.excludedFolders(workspaceFolder.uri);
            const pomFileUris = yield vscode_1.workspace.findFiles(new vscode_1.RelativePattern(workspaceFolder, "**/pom.xml"), `{${exclusions.join(",")}}`);
            return pomFileUris.map(_uri => _uri.fsPath);
        });
    }
    Utils.getAllPomPaths = getAllPomPaths;
    function showEffectivePom(pomPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const outputPath = Utils.getEffectivePomOutputPath(pomPath);
            yield vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Window }, (p) => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                p.report({ message: "Generating effective pom ... " });
                try {
                    yield Utils.executeInBackground(`help:effective-pom -Doutput="${outputPath}"`, pomPath);
                    resolve();
                }
                catch (error) {
                    vscode_extension_telemetry_wrapper_1.setUserError(error);
                    reject(error);
                }
            })));
            const pomxml = yield Utils.readFileIfExists(outputPath);
            fse.remove(outputPath);
            if (pomxml) {
                const document = yield vscode_1.workspace.openTextDocument({ language: "xml", content: pomxml });
                vscode_1.window.showTextDocument(document);
            }
        });
    }
    Utils.showEffectivePom = showEffectivePom;
    function excuteCustomGoal(pomPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pomPath) {
                return;
            }
            const inputGoals = yield vscode_1.window.showInputBox({ placeHolder: "e.g. clean package -DskipTests", ignoreFocusOut: true });
            const trimedGoals = inputGoals && inputGoals.trim();
            if (trimedGoals) {
                Utils.executeInTerminal(trimedGoals, pomPath);
            }
        });
    }
    Utils.excuteCustomGoal = excuteCustomGoal;
    function executeHistoricalGoals(projectPomPaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const candidates = Array.prototype.concat.apply([], yield Promise.all(projectPomPaths.map(projectPomPath => Utils.getLRUCommands(projectPomPath))));
            candidates.sort((a, b) => b.timestamp - a.timestamp);
            const selected = yield VSCodeUI_1.VSCodeUI.getQuickPick(candidates, (x) => x.command, null, (x) => x.pomPath, { placeHolder: "Select from history ... " });
            if (selected) {
                Utils.executeInTerminal(selected.command, selected.pomPath);
            }
        });
    }
    Utils.executeHistoricalGoals = executeHistoricalGoals;
    function executeMavenCommand(provider) {
        return __awaiter(this, void 0, void 0, function* () {
            // select a project(pomfile)
            const item = yield VSCodeUI_1.VSCodeUI.getQuickPick(provider.mavenProjectNodes, node => `$(primitive-dot) ${node.mavenProject.name}`, null, node => node.pomPath, { placeHolder: "Select a Maven project." });
            if (!item) {
                return;
            }
            // select a command
            const command = yield VSCodeUI_1.VSCodeUI.getQuickPick(["custom", "clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"], (x) => x === "custom" ? "Custom goals ..." : x, null, null, { placeHolder: "Select the goal to execute." });
            if (!command) {
                return;
            }
            // execute
            yield vscode_1.commands.executeCommand(`maven.goal.${command}`, item);
        });
    }
    Utils.executeMavenCommand = executeMavenCommand;
})(Utils = exports.Utils || (exports.Utils = {}));
//# sourceMappingURL=Utils.js.map