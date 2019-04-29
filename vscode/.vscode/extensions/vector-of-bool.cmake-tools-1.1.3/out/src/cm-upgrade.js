"use strict";
/**
 * Module for performing automatic CMake upgrades
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@cmt/logging");
const paths_1 = require("@cmt/paths");
const proc_1 = require("@cmt/proc");
const rollbar_1 = require("@cmt/rollbar");
const util_1 = require("@cmt/util");
const fs = require("fs");
const https = require("https");
const path = require("path");
const tmp = require("tmp");
const vscode = require("vscode");
const log = logging_1.createLogger('cm-upgrade');
const UPGRADE_PREFERENCE_KEY = 'cmakeUpgradePreference.1';
function upgradePreference(ext) {
    return ext.globalState.get(UPGRADE_PREFERENCE_KEY);
}
async function setUpgradePreference(ext, value) {
    await ext.globalState.update(UPGRADE_PREFERENCE_KEY, value);
}
async function downloadFile(url, opt, pr) {
    return new Promise((resolve, reject) => {
        tmp.file({ mode: 0b111000000, prefix: opt.prefix, postfix: opt.postfix }, (err, fpath, fd) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                const ostream = fs.createWriteStream(fpath, { fd });
                const req = https.get(url, res => {
                    if (res.statusCode !== 200) {
                        reject(new Error('Non-200 response when downloading new CMake installer'));
                        return;
                    }
                    let totalSize = 0;
                    try {
                        totalSize = parseInt(res.headers['content-length'] || '0');
                    }
                    catch (e) {
                        // Do nothing. Oh well.
                    }
                    let prevDownloaded = 0;
                    let totalDownloaded = 0;
                    res.on('data', data => {
                        totalDownloaded = totalDownloaded + data.length;
                        if (totalSize !== 0) {
                            const diffPercent = 100 * (totalDownloaded - prevDownloaded) / totalSize;
                            const totalPercent = 100 * totalDownloaded / totalSize;
                            if (diffPercent > 1) {
                                pr.report({
                                    increment: diffPercent,
                                    message: `${totalPercent.toFixed(0)}%`,
                                });
                                prevDownloaded = totalDownloaded;
                            }
                        }
                    });
                    res.pipe(ostream);
                    res.on('end', () => {
                        log.info(`Downloaded ${url} to ${fpath}`);
                        resolve(fpath);
                    });
                });
                req.on('error', e => reject(e));
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
async function installLinux(url) {
    const pkexec = await paths_1.default.which('pkexec');
    if (!pkexec) {
        vscode.window.showErrorMessage('CMake Tools needs `pkexec` program to run the CMake installer');
        return;
    }
    const filename = path.basename(url, '.sh');
    const installerPath = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Downloading ${filename}`,
    }, pr => downloadFile(url, { prefix: filename, postfix: '.sh' }, pr));
    const res = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running CMake Installer',
    }, () => {
        const proc = proc_1.execute(pkexec, [installerPath, '--exclude-subdir', '--prefix=/usr/local']);
        return proc.result;
    });
    if (res.retc === 127) {
        vscode.window.showErrorMessage('Failed to authorize for running the CMake installation.');
    }
    else if (res.retc === 126) {
        vscode.window.showErrorMessage('You dismissed the request for permission to perform the CMake installation.');
    }
    else if (res.retc !== 0) {
        log.error(`The CMake installer returned non-zero [${res.retc}]: `, res.stderr);
        vscode.window.showErrorMessage('The CMake installer exited with non-zero. Check the output panel for more information');
    }
    else {
        const restartNow = 'Restart Now';
        const chosen = await vscode.window.showInformationMessage('The new CMake is successfull installed to /usr/local/bin/cmake. Reload VSCode to complete changes.', restartNow);
        if (chosen === restartNow) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}
async function maybeUpgradeCMake(ext, opt) {
    if (process.platform !== 'linux') {
        // Only implemented on Linux so far
        return;
    }
    const pref = upgradePreference(ext);
    if (pref === 'never') {
        // The user never wants to auto-upgrade
        return;
    }
    else if (pref) {
        // User is delaying the upgrade
        const timeSinceNag = new Date().getTime() - pref.lastNag;
        if (timeSinceNag < (1000 * 60 * 60 * 48)) {
            // Only ask every two days
            return;
        }
    }
    // Check for an upgrade
    let upgradeAvailable;
    try {
        upgradeAvailable = util_1.versionLess(opt.currentVersion, opt.available.version);
    }
    catch (e) {
        if (!(e instanceof util_1.InvalidVersionString)) {
            rollbar_1.default.exception('Error comparing CMake versions for potential upgrade', e, opt);
        }
        return null;
    }
    if (!upgradeAvailable) {
        // Nothing to do. Okay.
        return;
    }
    const doTheUpgrade = 'Yes';
    const askMeLater = 'Ask me Later';
    const dontAskAgain = 'Don\'t Ask Me Again';
    const chosen = await vscode.window.showInformationMessage(`There is a new version of CMake available. You are running ${util_1.versionToString(opt.currentVersion)}, ` +
        `and ${opt.available.version} is available. ` +
        'Would you like CMake Tools to download and install this update automatically?', doTheUpgrade, askMeLater, dontAskAgain);
    if (chosen === undefined) {
        // They didn't make a choice. Ask again the next time we poll.
        return;
    }
    if (chosen === dontAskAgain) {
        await setUpgradePreference(ext, 'never');
        return;
    }
    if (chosen === askMeLater) {
        await setUpgradePreference(ext, { lastNag: new Date().getTime() });
        return;
    }
    console.assert(chosen == doTheUpgrade);
    switch (process.platform) {
        // case 'win32':
        //   await installWindows(opt.available.windowsURL);
        //   break;
        case 'linux':
            await installLinux(opt.available.linuxURL);
            break;
        // case 'darwin':
        //   // TODO
        //   break;
        default:
            // Not sure how we get on this platform... But okay.
            return;
    }
}
exports.maybeUpgradeCMake = maybeUpgradeCMake;
//# sourceMappingURL=cm-upgrade.js.map