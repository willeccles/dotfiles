"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const vscode_1 = require("vscode"); // tslint:disable-line
const vsls = require("vsls/vscode");
const lang = require('../data/languages.json'); // tslint:disable-line
const knownExtentions = lang.knownExtentions;
const knownLanguages = lang.knownLanguages;
const empty = '\u200b\u200b';
const sizes = [' bytes', 'kb', 'mb', 'gb', 'tb'];
class Activity {
    constructor() {
        this._state = null; // tslint:disable-line
        this._config = vscode_1.workspace.getConfiguration('discord'); // tslint:disable-line
        this._lastKnownFile = ''; // tslint:disable-line
    }
    get state() {
        return this._state;
    }
    generate(workspaceElapsedTime = false) {
        let largeImageKey = 'vscode-big';
        if (vscode_1.window.activeTextEditor) {
            if (vscode_1.window.activeTextEditor.document.fileName === this._lastKnownFile) {
                return this._state = Object.assign({}, this._state, { details: this._generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle', this._state.largeImageKey), smallImageKey: vscode_1.debug.activeDebugSession ? 'debug' : vscode_1.env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode', state: this._generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle', this._state.largeImageKey) });
            }
            this._lastKnownFile = vscode_1.window.activeTextEditor.document.fileName;
            const filename = path_1.basename(vscode_1.window.activeTextEditor.document.fileName);
            largeImageKey = knownExtentions[Object.keys(knownExtentions).find(key => {
                if (key.startsWith('.') && filename.endsWith(key))
                    return true;
                const match = key.match(/^\/(.*)\/([mgiy]+)$/);
                if (!match)
                    return false;
                const regex = new RegExp(match[1], match[2]);
                return regex.test(filename);
            })] || (knownLanguages.includes(vscode_1.window.activeTextEditor.document.languageId) ? vscode_1.window.activeTextEditor.document.languageId : null);
        }
        let previousTimestamp = null;
        if (this._state && this._state.startTimestamp)
            previousTimestamp = this._state.startTimestamp;
        this._state = Object.assign({}, this._state, { details: this._generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle', largeImageKey), startTimestamp: vscode_1.window.activeTextEditor && previousTimestamp && workspaceElapsedTime ? previousTimestamp : vscode_1.window.activeTextEditor ? new Date().getTime() : null, state: this._generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle', largeImageKey), largeImageKey: largeImageKey ? largeImageKey.image || largeImageKey : 'txt', largeImageText: vscode_1.window.activeTextEditor
                ? this._config.get('largeImage')
                    .replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt')
                    .replace('{Lang}', largeImageKey ? (largeImageKey.image || largeImageKey).toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Txt')
                    .replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT')
                    || vscode_1.window.activeTextEditor.document.languageId.padEnd(2, '\u200b')
                : this._config.get('largeImageIdle'), smallImageKey: vscode_1.debug.activeDebugSession ? 'debug' : vscode_1.env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode', smallImageText: this._config.get('smallImage').replace('{appname}', vscode_1.env.appName) });
        return this._state;
    }
    allowSpectate() {
        return __awaiter(this, void 0, void 0, function* () {
            const liveshare = yield vsls.getApi();
            if (!liveshare)
                return;
            const join = yield liveshare.share({ suppressNotification: true, access: vsls.Access.ReadOnly });
            this._state = Object.assign({}, this._state, { spectateSecret: join ? Buffer.from(join.toString()).toString('base64') : undefined, instance: true });
            return this._state;
        });
    }
    disableSpectate() {
        return __awaiter(this, void 0, void 0, function* () {
            const liveshare = yield vsls.getApi();
            if (!liveshare)
                return;
            yield liveshare.end();
            this._state = Object.assign({}, this._state, { spectateSecret: undefined, instance: false });
            return this._state;
        });
    }
    allowJoinRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            const liveshare = yield vsls.getApi();
            if (!liveshare)
                return;
            const join = yield liveshare.share({ suppressNotification: true });
            this._state = Object.assign({}, this._state, { partyId: join ? join.query : undefined, partySize: 1, partyMax: 5, joinSecret: join ? Buffer.from(join.toString()).toString('base64') : undefined, instance: true });
            return this._state;
        });
    }
    disableJoinRequests() {
        return __awaiter(this, void 0, void 0, function* () {
            const liveshare = yield vsls.getApi();
            if (!liveshare)
                return;
            yield liveshare.end();
            this._state = Object.assign({}, this._state, { partyId: undefined, partySize: undefined, partyMax: undefined, joinSecret: undefined, instance: false });
            return this._state;
        });
    }
    changePartyId(id) {
        if (!this._state)
            return;
        this._state = Object.assign({}, this._state, { partyId: id, partySize: this._state.partySize ? this._state.partySize + 1 : 1, partyMax: id ? 5 : undefined });
        return this._state;
    }
    increasePartySize(size) {
        if (!this._state)
            return;
        if (this.state && this._state.partySize === 5)
            return;
        this._state = Object.assign({}, this._state, { partySize: this._state.partySize ? this._state.partySize + 1 : size });
        return this._state;
    }
    decreasePartySize(size) {
        if (!this._state)
            return;
        if (this.state && this._state.partySize === 1)
            return;
        this._state = Object.assign({}, this._state, { partySize: this._state.partySize ? this._state.partySize - 1 : size });
        return this._state;
    }
    dispose() {
        this._state = null;
        this._lastKnownFile = '';
    }
    _generateDetails(debugging, editing, idling, largeImageKey) {
        let raw = this._config.get(idling).replace('{null}', empty);
        let filename = null;
        let dirname = null;
        let checkState = false;
        let workspaceFolder = null;
        let fullDirname = null;
        if (vscode_1.window.activeTextEditor) {
            filename = path_1.basename(vscode_1.window.activeTextEditor.document.fileName);
            const { dir } = path_1.parse(vscode_1.window.activeTextEditor.document.fileName);
            const split = dir.split(path_1.sep);
            dirname = split[split.length - 1];
            checkState = Boolean(vscode_1.workspace.getWorkspaceFolder(vscode_1.window.activeTextEditor.document.uri));
            workspaceFolder = checkState ? vscode_1.workspace.getWorkspaceFolder(vscode_1.window.activeTextEditor.document.uri) : null;
            if (workspaceFolder) {
                const { name } = workspaceFolder;
                const relativePath = vscode_1.workspace.asRelativePath(vscode_1.window.activeTextEditor.document.fileName).split(path_1.sep);
                relativePath.splice(-1, 1);
                fullDirname = `${name}${path_1.sep}${relativePath.join(path_1.sep)}`;
            }
            if (vscode_1.debug.activeDebugSession) {
                raw = this._config.get(debugging);
            }
            else {
                raw = this._config.get(editing);
            }
            const { totalLines, size, currentLine, currentColumn } = this._generateFileDetails(raw);
            raw = raw
                .replace('{null}', empty)
                .replace('{filename}', filename)
                .replace('{dirname}', dirname)
                .replace('{fulldirname}', fullDirname)
                .replace('{workspace}', checkState && workspaceFolder ? workspaceFolder.name : this._config.get('lowerDetailsNotFound').replace('{null}', empty))
                .replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt')
                .replace('{Lang}', largeImageKey ? (largeImageKey.image || largeImageKey).toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Txt')
                .replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT');
            if (totalLines)
                raw = raw.replace('{totallines}', totalLines);
            if (size)
                raw = raw.replace('{filesize}', size);
            if (currentLine)
                raw = raw.replace('{currentline}', currentLine);
            if (currentColumn)
                raw = raw.replace('{currentcolumn}', currentColumn);
        }
        return raw;
    }
    _generateFileDetails(str) {
        const fileDetail = {};
        if (!str)
            return fileDetail;
        if (vscode_1.window.activeTextEditor) {
            if (str.includes('{totallines}')) {
                fileDetail.totalLines = vscode_1.window.activeTextEditor.document.lineCount.toLocaleString();
            }
            if (str.includes('{currentline}')) {
                fileDetail.currentLine = (vscode_1.window.activeTextEditor.selection.active.line + 1).toLocaleString(); // tslint:disable-line
            }
            if (str.includes('{currentcolumn}')) {
                fileDetail.currentColumn = (vscode_1.window.activeTextEditor.selection.active.character + 1).toLocaleString(); // tslint:disable-line
            }
            if (str.includes('{filesize}')) {
                let currentDivision = 0;
                let { size } = fs_1.statSync(vscode_1.window.activeTextEditor.document.fileName);
                const originalSize = size;
                if (originalSize > 1000) {
                    size /= 1000;
                    currentDivision++;
                    while (size > 1000) {
                        currentDivision++;
                        size /= 1000;
                    }
                }
                fileDetail.size = `${originalSize > 1000 ? size.toFixed(2) : size}${sizes[currentDivision]}`;
            }
        }
        return fileDetail;
    }
}
exports.default = Activity;

//# sourceMappingURL=Activity.js.map
