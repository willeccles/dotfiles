"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const winston = require("winston");
const Configs = require("../../Constants/configs");
function configure(context, transports) {
    winston.configure({
        transports: [
            ...transports,
            new (winston.transports.File)({ level: 'info', filename: context.asAbsolutePath(Configs.LOG_FILE_NAME) }),
        ],
    });
}
exports.configure = configure;
function info(message, metadata, _userTag) {
    winston.info(message, withUserTag(withSessionId(metadata)));
}
exports.info = info;
function warn(message, metadata, _userTag) {
    winston.warn(message, withUserTag(withSessionId(metadata)));
}
exports.warn = warn;
function error(message, metadata, _userTag) {
    winston.error(message, withUserTag(withSessionId(metadata)));
}
exports.error = error;
function currentSessionId() {
    const session = vscode_extension_telemetry_wrapper_1.TelemetryWrapper.currentSession();
    return session ? session.id : undefined;
}
exports.currentSessionId = currentSessionId;
function currentCommand() {
    const session = vscode_extension_telemetry_wrapper_1.TelemetryWrapper.currentSession();
    return session ? session.action : undefined;
}
exports.currentCommand = currentCommand;
function withSessionId(metadata) {
    return Object.assign({ sessionId: currentSessionId() }, metadata);
}
function withUserTag(metadata, tag) {
    return Object.assign({ userTag: tag ? tag : false }, metadata);
}
//# sourceMappingURL=logger.js.map