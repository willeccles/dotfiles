"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const Commands = require("../../Constants/commands");
const Logger = require("./logger");
const loglevel_1 = require("./loglevel");
class OutputTransport extends winston.Transport {
    constructor(options) {
        super(options);
        this.channel = options.channel;
        this.level = options.level || 'info';
    }
    log(level, msg, _meta, callback) {
        const logLevel = loglevel_1.LogLevel[level];
        if (logLevel === undefined || logLevel > loglevel_1.LogLevel[this.level]) {
            return;
        }
        const command = Logger.currentCommand();
        if (!command || !OutputTransport.commandList.has(command)) {
            return;
        }
        this.channel.append(msg);
        super.emit('logged');
        if (callback) {
            callback(null, true);
        }
    }
}
OutputTransport.commandList = new Set([
    Commands.JAVA_RUN_TEST_COMMAND,
    Commands.JAVA_DEBUG_TEST_COMMAND,
    Commands.JAVA_TEST_EXPLORER_RUN_TEST,
    Commands.JAVA_TEST_EXPLORER_DEBUG_TEST,
    Commands.JAVA_TEST_CANCEL,
    Commands.JAVA_TEST_EXPLORER_RUN_TEST_WITH_CONFIG,
    Commands.JAVA_TEST_EXPLORER_DEBUG_TEST_WITH_CONFIG,
]);
exports.OutputTransport = OutputTransport;
//# sourceMappingURL=outputTransport.js.map