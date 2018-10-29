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
// Import the required functions & object types from various packages.
const discord_rpc_1 = require("discord-rpc");
const path_1 = require("path");
const timers_1 = require("timers");
const vscode_1 = require("vscode");
const fs_1 = require("fs");
const lang = require('./data/languages.json');
const knownExtentions = lang.knownExtentions;
const knownLanguages = lang.knownLanguages;
// Define the RPC variable and its type.
let rpc;
// Define the config variable and its type.
let config;
// Define the reconnecting var and its type.
let reconnecting;
// Define the reconnect counter and its type.
let reconnectCounter = 0;
// Define the last known file and its type.
let lastKnownFile;
// Define the activity object.
let activity;
// Define the activity timer to not spam the API with requests.
let activityTimer;
// Define the status bar icon
let statusBarIcon;
// `Activate` is fired when the extension is enabled. This SHOULD only fire once.
function activate(context) {
    console.log('[Discord Presence]: Activated!');
    // Get the workspace's configuration for "discord".
    config = vscode_1.workspace.getConfiguration('discord');
    // Obtain whether or not the extension is activated.
    if (config.get('enabled'))
        initRPC(config.get('clientID'));
    // Register the `discord.enable` command, and set the `enabled` config option to true.
    const enabler = vscode_1.commands.registerCommand('discord.enable', () => __awaiter(this, void 0, void 0, function* () {
        if (rpc)
            yield destroyRPC();
        yield config.update('enabled', true);
        config = vscode_1.workspace.getConfiguration('discord');
        initRPC(config.get('clientID'));
        vscode_1.window.showInformationMessage('Enabled Discord Rich Presence for this workspace.');
    }));
    // Register the `discord.disable` command, and set the `enabled` config option to false.
    const disabler = vscode_1.commands.registerCommand('discord.disable', () => __awaiter(this, void 0, void 0, function* () {
        if (!rpc)
            return vscode_1.window.showWarningMessage('Discord Rich Presence is already disabled in this workspace.');
        yield config.update('enabled', false);
        config = vscode_1.workspace.getConfiguration('discord');
        yield destroyRPC();
        vscode_1.window.showInformationMessage('Disabled Discord Rich Presence for this workspace.');
    }));
    // Register the `discord.reconnect` command
    const reconnecter = vscode_1.commands.registerCommand('discord.reconnect', () => __awaiter(this, void 0, void 0, function* () {
        if (rpc)
            try {
                yield destroyRPC();
            }
            catch (_a) { }
        initRPC(config.get('clientID'), true);
        if (!config.get('silent'))
            vscode_1.window.showInformationMessage('Reconnecting to Discord RPC');
        if (statusBarIcon)
            statusBarIcon.text = '$(pulse) Reconnecting';
    }));
    // Push the new commands into the subscriptions.
    context.subscriptions.push(enabler, disabler, reconnecter);
}
exports.activate = activate;
// `Deactivate` is fired whenever the extension is deactivated.
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        // If there's an RPC Client initalized, destroy it.
        yield destroyRPC();
    });
}
exports.deactivate = deactivate;
// Initalize the RPC systems.
function initRPC(clientID, loud) {
    // Update the RPC variable with a new RPC Client.
    rpc = new discord_rpc_1.Client({ transport: 'ipc' });
    // Once the RPC Client is ready, set the activity.
    rpc.once('ready', () => {
        console.log('[Discord Presence]: Successfully connected to Discord');
        // Announce the reconnection
        if (loud && !config.get('silent'))
            vscode_1.window.showInformationMessage('Successfully reconnected to Discord RPC');
        // Remove icon if connected
        if (statusBarIcon) {
            statusBarIcon.dispose();
            statusBarIcon = null;
        }
        // Stop from reconnecing.
        reconnecting = false;
        // This is purely for safety measures.
        if (activityTimer) {
            // Clear the activity interval.
            timers_1.clearInterval(activityTimer);
            // Null activity variable.
            activityTimer = null;
        }
        // Reset the reconnect counter to 0 on a successful reconnect.
        reconnectCounter = 0;
        setActivity();
        // Set the activity once on ready
        setTimeout(() => rpc.setActivity(activity).catch(err => console.error(`[Discord Presence]: ${err}`)), 500);
        // Make sure to listen to the close event and dispose and destroy everything accordingly.
        rpc.transport.once('close', () => __awaiter(this, void 0, void 0, function* () {
            if (!config.get('enabled'))
                return;
            yield destroyRPC();
            // Set the client to begin reconnecting
            reconnecting = true;
            initRPC(config.get('clientID'));
            // Create reconnecting button
            createButton(true);
        }));
        // Update the user's activity to the `activity` variable.
        activityTimer = timers_1.setInterval(() => {
            // Update the config before updating the activity
            config = vscode_1.workspace.getConfiguration('discord');
            setActivity(Boolean(config.get('workspaceElapsedTime')));
            rpc.setActivity(activity).catch(err => console.error(`[Discord Presence]: ${err}`));
        }, 15000);
    });
    // Log in to the RPC Client, and check whether or not it errors.
    rpc.login({ clientId: clientID }).catch((error) => __awaiter(this, void 0, void 0, function* () {
        // Check if the client is reconnecting
        console.error(`[Discord Presence]: ${error}`);
        if (reconnecting) {
            // Destroy and dispose of everything after the set reconnect attempts
            if (reconnectCounter >= config.get('reconnectThreshold')) {
                // Create reconnect button
                createButton();
                yield destroyRPC();
            }
            else {
                // Increment the counter
                reconnectCounter++;
                // Create reconnecting button
                createButton(true);
                // Retry connection
                initRPC(config.get('clientID'));
                return;
            }
        }
        // Announce failure
        if (!config.get('silent')) {
            if (error.message.includes('ENOENT'))
                vscode_1.window.showErrorMessage('No Discord Client detected!');
            else
                vscode_1.window.showErrorMessage(`Couldn't connect to Discord via RPC: ${error.toString()}`);
            createButton();
        }
    }));
}
// Create reconnect button
function createButton(isReconnecting) {
    // Check if the button exists already
    if (!statusBarIcon) {
        // Create the icon
        statusBarIcon = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left);
        // Check if the client is reconnecting
        if (isReconnecting) {
            // Show attempts left
            const attempts = config.get('reconnectThreshold') - reconnectCounter;
            statusBarIcon.text = `$(issue-reopened) Reconnecting: ${attempts} attempt${attempts === 1 ? '' : 's'} left`;
            statusBarIcon.command = '';
        }
        else {
            // Show button to reconnect
            statusBarIcon.text = '$(plug) Reconnect to Discord';
            statusBarIcon.command = 'discord.reconnect';
        }
        // Show the button
        statusBarIcon.show();
    }
    else {
        // Check if the client is reconnecting
        if (isReconnecting) {
            // Show attempts left
            const attempts = config.get('reconnectThreshold') - reconnectCounter;
            statusBarIcon.text = `$(issue-reopened) Reconnecting: ${attempts} attempt${attempts === 1 ? '' : 's'} left`;
            statusBarIcon.command = '';
        }
        else {
            // Show button to reconnect
            statusBarIcon.text = '$(plug) Reconnect to Discord';
            statusBarIcon.command = 'discord.reconnect';
        }
    }
}
// Cleanly destroy the RPC client (if it isn't already) && add icon to reconnect
function destroyRPC() {
    return __awaiter(this, void 0, void 0, function* () {
        // Do not continue if RPC isn't initalized.
        if (!rpc)
            return;
        // Stop reconnecting.
        reconnecting = false;
        // Clear the activity interval.
        if (activityTimer)
            timers_1.clearInterval(activityTimer);
        // Null the activity timer.
        activityTimer = null;
        // If there's an RPC Client initalized, destroy it.
        yield rpc.destroy();
        // Null the RPC variable.
        rpc = null;
        // Null the last known file.
        lastKnownFile = null;
    });
}
// This function updates the activity (The Client's Rich Presence status).
function setActivity(workspaceElapsedTime = false) {
    // Do not continue if RPC isn't initalized.
    if (!rpc)
        return;
    if (vscode_1.window.activeTextEditor && vscode_1.window.activeTextEditor.document.fileName === lastKnownFile) {
        activity = Object.assign({}, activity, { details: generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle'), state: generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle'), smallImageKey: vscode_1.debug.activeDebugSession
                ? 'debug'
                : vscode_1.env.appName.includes('Insiders')
                    ? 'vscode-insiders'
                    : 'vscode' });
        return;
    }
    lastKnownFile = vscode_1.window.activeTextEditor ? vscode_1.window.activeTextEditor.document.fileName : null;
    const fileName = vscode_1.window.activeTextEditor ? path_1.basename(vscode_1.window.activeTextEditor.document.fileName) : null;
    const largeImageKey = vscode_1.window.activeTextEditor
        ? knownExtentions[Object.keys(knownExtentions).find(key => {
            if (key.startsWith('.') && fileName.endsWith(key))
                return true;
            const match = key.match(/^\/(.*)\/([mgiy]+)$/);
            if (!match)
                return false;
            const regex = new RegExp(match[1], match[2]);
            return regex.test(fileName);
        })] || (knownLanguages.includes(vscode_1.window.activeTextEditor.document.languageId) ? vscode_1.window.activeTextEditor.document.languageId : null)
        : 'vscode-big';
    // Get the previous activity start timestamp (if available) to preserve workspace elapsed time
    let previousTimestamp = null;
    if (activity)
        previousTimestamp = activity['startTimestamp'];
    // Create a JSON Object with the user's activity information.
    activity = {
        details: generateDetails('detailsDebugging', 'detailsEditing', 'detailsIdle'),
        state: generateDetails('lowerDetailsDebugging', 'lowerDetailsEditing', 'lowerDetailsIdle'),
        startTimestamp: vscode_1.window.activeTextEditor && previousTimestamp && workspaceElapsedTime ? previousTimestamp : vscode_1.window.activeTextEditor ? new Date().getTime() : null,
        largeImageKey: largeImageKey
            ? largeImageKey.image
                || largeImageKey
            : 'txt',
        largeImageText: vscode_1.window.activeTextEditor
            ? config.get('largeImage').replace('{lang}', largeImageKey ? largeImageKey.image || largeImageKey : 'txt').replace('{LANG}', largeImageKey ? (largeImageKey.image || largeImageKey).toUpperCase() : 'TXT')
                || vscode_1.window.activeTextEditor.document.languageId.padEnd(2, '\u200b')
            : config.get('largeImageIdle'),
        smallImageKey: vscode_1.debug.activeDebugSession
            ? 'debug'
            : vscode_1.env.appName.includes('Insiders')
                ? 'vscode-insiders'
                : 'vscode',
        smallImageText: config.get('smallImage').replace('{appname}', vscode_1.env.appName),
        instance: false
    };
}
function generateDetails(debugging, editing, idling) {
    const emptySpaces = '\u200b\u200b';
    let string = config.get(idling).replace('{null}', emptySpaces);
    const fileName = vscode_1.window.activeTextEditor ? path_1.basename(vscode_1.window.activeTextEditor.document.fileName) : null;
    let dirName = null;
    if (vscode_1.window.activeTextEditor) {
        const { dir } = path_1.parse(vscode_1.window.activeTextEditor.document.fileName);
        const split = dir.split(path_1.sep);
        dirName = split[split.length - 1];
    }
    const checkState = vscode_1.window.activeTextEditor
        ? Boolean(vscode_1.workspace.getWorkspaceFolder(vscode_1.window.activeTextEditor.document.uri))
        : false;
    const workspaceFolder = checkState ? vscode_1.workspace.getWorkspaceFolder(vscode_1.window.activeTextEditor.document.uri) : null;
    let fullDirName = null;
    if (workspaceFolder) {
        const { name } = workspaceFolder;
        const relativePath = vscode_1.workspace.asRelativePath(vscode_1.window.activeTextEditor.document.fileName).split(path_1.sep);
        relativePath.splice(-1, 1);
        fullDirName = `${name}${path_1.sep}${relativePath.join(path_1.sep)}`;
    }
    if (vscode_1.window.activeTextEditor) {
        if (vscode_1.debug.activeDebugSession) {
            let rawString = config.get(debugging);
            const { totalLines, size, currentLine, currentColumn } = getFileDetails(rawString);
            rawString = rawString
                .replace('{null}', emptySpaces)
                .replace('{filename}', fileName)
                .replace('{dirname}', dirName)
                .replace('{fulldirname}', fullDirName)
                .replace('{workspace}', checkState ?
                workspaceFolder.name :
                config.get('lowerDetailsNotFound').replace('{null}', emptySpaces));
            if (totalLines)
                rawString = rawString.replace('{totallines}', totalLines);
            if (size)
                rawString = rawString.replace('{filesize}', size);
            if (currentLine)
                rawString = rawString.replace('{currentline}', currentLine);
            if (currentColumn)
                rawString = rawString.replace('{currentcolumn}', currentColumn);
            string = rawString;
        }
        else {
            let rawString = config.get(editing);
            const { totalLines, size, currentLine, currentColumn } = getFileDetails(rawString);
            rawString = rawString
                .replace('{null}', emptySpaces)
                .replace('{filename}', fileName)
                .replace('{dirname}', dirName)
                .replace('{fulldirname}', fullDirName)
                .replace('{workspace}', checkState ?
                workspaceFolder.name :
                config.get('lowerDetailsNotFound').replace('{null}', emptySpaces));
            if (totalLines)
                rawString = rawString.replace('{totallines}', totalLines);
            if (size)
                rawString = rawString.replace('{filesize}', size);
            if (currentLine)
                rawString = rawString.replace('{currentline}', currentLine);
            if (currentColumn)
                rawString = rawString.replace('{currentcolumn}', currentColumn);
            string = rawString;
        }
    }
    return string;
}
function getFileDetails(rawString) {
    const obj = {
        size: null,
        totalLines: null,
        currentLine: null,
        currentColumn: null,
    };
    if (!rawString)
        return obj;
    if (rawString.includes('{totallines}')) {
        obj.totalLines = vscode_1.window.activeTextEditor.document.lineCount.toLocaleString();
    }
    if (rawString.includes('{currentline}')) {
        obj.currentLine = (vscode_1.window.activeTextEditor.selection.active.line + 1).toLocaleString();
    }
    if (rawString.includes('{currentcolumn}')) {
        obj.currentColumn = (vscode_1.window.activeTextEditor.selection.active.character + 1).toLocaleString();
    }
    if (rawString.includes('{filesize}')) {
        const sizes = [' bytes', 'kb', 'mb', 'gb', 'tb'];
        let currentDivision = 0;
        let { size } = fs_1.statSync(vscode_1.window.activeTextEditor.document.fileName);
        const originalSize = size;
        if (originalSize > 1000) {
            size = size / 1000;
            currentDivision++;
            while (size > 1000) {
                currentDivision++;
                size = size / 1000;
            }
        }
        obj.size = `${originalSize > 1000 ? size.toFixed(2) : size}${sizes[currentDivision]}`;
    }
    return obj;
}
//# sourceMappingURL=extension.js.map