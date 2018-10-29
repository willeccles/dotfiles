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
const fse = require("fs-extra");
const os = require("os");
const path = require("path");
const vscode_1 = require("vscode");
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const Utils_1 = require("../Utils");
const VSCodeUI_1 = require("../VSCodeUI");
const Archetype_1 = require("./Archetype");
// tslint:disable-next-line:no-http-string
const REMOTE_ARCHETYPE_CATALOG_URL = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";
const POPULAR_ARCHETYPES_URL = "https://vscodemaventelemetry.blob.core.windows.net/public/popular_archetypes.json";
class Step {
    constructor(name, info) {
        this.name = name;
        this.info = info;
    }
}
const stepTargetFolder = new Step("TargetFolder", "Target folder selected.");
const stepListMore = new Step("ListMore", "All archetypes listed.");
const stepArchetype = new Step("Archetype", "Archetype selected.");
function finishStep(step) {
    const session = vscode_extension_telemetry_wrapper_1.TelemetryWrapper.currentSession();
    if (session && session.extraProperties) {
        if (!session.extraProperties.finishedSteps) {
            session.extraProperties.finishedSteps = [];
        }
        session.extraProperties.finishedSteps.push(step.name);
    }
    vscode_extension_telemetry_wrapper_1.TelemetryWrapper.info(step.info);
}
var ArchetypeModule;
(function (ArchetypeModule) {
    function generateFromArchetype(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            // select archetype.
            let selectedArchetype = yield showQuickPickForArchetypes();
            if (selectedArchetype === undefined) {
                return;
            }
            if (!selectedArchetype.artifactId) {
                finishStep(stepListMore);
                selectedArchetype = yield showQuickPickForArchetypes({ all: true });
                if (!selectedArchetype) {
                    return;
                }
            }
            const { artifactId, groupId } = selectedArchetype;
            const session = vscode_extension_telemetry_wrapper_1.TelemetryWrapper.currentSession();
            if (session && session.extraProperties) {
                session.extraProperties.artifactId = artifactId;
                session.extraProperties.groupId = groupId;
            }
            finishStep(stepArchetype);
            // choose target folder.
            const result = yield VSCodeUI_1.VSCodeUI.openDialogForFolder({
                defaultUri: entry && entry.fsPath ? vscode_1.Uri.file(entry.fsPath) : undefined,
                openLabel: "Select Destination Folder"
            });
            const cwd = result && result.fsPath;
            if (!cwd) {
                return;
            }
            finishStep(stepTargetFolder);
            // execute.
            const cmd = [
                "archetype:generate",
                `-DarchetypeArtifactId="${artifactId}"`,
                `-DarchetypeGroupId="${groupId}"`
            ].join(" ");
            Utils_1.Utils.executeInTerminal(cmd, null, { cwd });
        });
    }
    ArchetypeModule.generateFromArchetype = generateFromArchetype;
    function updateArchetypeCatalog() {
        return __awaiter(this, void 0, void 0, function* () {
            const xml = yield Utils_1.Utils.downloadFile(REMOTE_ARCHETYPE_CATALOG_URL, true);
            const archetypes = yield listArchetypeFromXml(xml);
            const targetFilePath = path.join(Utils_1.Utils.getPathToExtensionRoot(), "resources", "archetypes.json");
            yield fse.ensureFile(targetFilePath);
            yield fse.writeJSON(targetFilePath, archetypes);
        });
    }
    ArchetypeModule.updateArchetypeCatalog = updateArchetypeCatalog;
    function showQuickPickForArchetypes(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield VSCodeUI_1.VSCodeUI.getQuickPick(loadArchetypePickItems(options), (item) => item.artifactId ? `$(package) ${item.artifactId} ` : "More ...", (item) => item.groupId ? `${item.groupId}` : "", (item) => item.description, { matchOnDescription: true, placeHolder: "Select an archetype ..." });
        });
    }
    function loadArchetypePickItems(options) {
        return __awaiter(this, void 0, void 0, function* () {
            // from local catalog
            const localItems = yield getLocalArchetypeItems();
            // from cached remote-catalog
            const remoteItems = yield getCachedRemoteArchetypeItems();
            const localOnlyItems = localItems.filter(localItem => !remoteItems.find(remoteItem => remoteItem.identifier === localItem.identifier));
            if (options && options.all) {
                return [].concat(localOnlyItems, remoteItems);
            }
            else {
                const recommendedItems = yield getRecomendedItems(remoteItems);
                return [new Archetype_1.Archetype(null, null, null, "Find more archetypes available in remote catalog.")].concat(localOnlyItems, recommendedItems);
            }
        });
    }
    function getRecomendedItems(allItems) {
        return __awaiter(this, void 0, void 0, function* () {
            // Top popular archetypes according to usage data
            let fixedList;
            try {
                const rawlist = yield Utils_1.Utils.downloadFile(POPULAR_ARCHETYPES_URL, true);
                fixedList = JSON.parse(rawlist);
            }
            catch (error) {
                fixedList = [];
            }
            return fixedList.map((fullname) => allItems.find((item) => fullname === `${item.groupId}:${item.artifactId}`));
        });
    }
    function listArchetypeFromXml(xmlString) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const xmlObject = yield Utils_1.Utils.parseXmlContent(xmlString);
                const catalog = xmlObject && xmlObject["archetype-catalog"];
                const dict = {};
                const archetypeList = catalog.archetypes[0].archetype;
                archetypeList.forEach(archetype => {
                    const groupId = archetype.groupId && archetype.groupId[0];
                    const artifactId = archetype.artifactId && archetype.artifactId[0];
                    const description = archetype.description && archetype.description[0];
                    const version = archetype.version && archetype.version[0];
                    const repository = archetype.repository && archetype.repository[0];
                    const identifier = `${groupId}:${artifactId}`;
                    if (!dict[identifier]) {
                        dict[identifier] = new Archetype_1.Archetype(artifactId, groupId, repository, description);
                    }
                    if (dict[identifier].versions.indexOf(version) < 0) {
                        dict[identifier].versions.push(version);
                    }
                });
                return Object.keys(dict).map((k) => dict[k]);
            }
            catch (err) {
                // do nothing
            }
            return [];
        });
    }
    function getLocalArchetypeItems() {
        return __awaiter(this, void 0, void 0, function* () {
            const localCatalogPath = path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
            if (yield fse.pathExists(localCatalogPath)) {
                const buf = yield fse.readFile(localCatalogPath);
                return listArchetypeFromXml(buf.toString());
            }
            else {
                return [];
            }
        });
    }
    function getCachedRemoteArchetypeItems() {
        return __awaiter(this, void 0, void 0, function* () {
            const contentPath = Utils_1.Utils.getPathToExtensionRoot("resources", "archetypes.json");
            if (yield fse.pathExists(contentPath)) {
                return (yield fse.readJSON(contentPath)).map((rawItem) => new Archetype_1.Archetype(rawItem.artifactId, rawItem.groupId, rawItem.repository, rawItem.description, rawItem.versions));
            }
            else {
                return [];
            }
        });
    }
})(ArchetypeModule = exports.ArchetypeModule || (exports.ArchetypeModule = {}));
//# sourceMappingURL=ArchetypeModule.js.map