"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class CommandUtility {
    static getCommandWithArgs(command, args) {
        if (!args) {
            return command;
        }
        const commandWithArgs = `${command}-args`;
        const exists = CommandUtility.proxiesHashes.has(commandWithArgs);
        if (exists) {
            CommandUtility.proxiesHashes.get(commandWithArgs).dispose();
        }
        const composite = vscode_1.commands.registerCommand(commandWithArgs, () => {
            vscode_1.commands.executeCommand(command, ...args);
        });
        CommandUtility.proxiesHashes.set(commandWithArgs, composite);
        return commandWithArgs;
    }
    static clearCommandsCache() {
        CommandUtility.proxiesHashes.forEach((c) => c.dispose());
        CommandUtility.proxiesHashes.clear();
    }
}
CommandUtility.proxiesHashes = new Map();
exports.CommandUtility = CommandUtility;
//# sourceMappingURL=commandUtility.js.map