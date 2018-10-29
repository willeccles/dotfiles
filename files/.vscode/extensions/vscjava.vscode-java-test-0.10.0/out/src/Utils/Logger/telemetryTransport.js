"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_extension_telemetry_wrapper_1 = require("vscode-extension-telemetry-wrapper");
const winston = require("winston");
const Constants = require("../../Constants/constants");
const Logger = require("./logger");
const loglevel_1 = require("./loglevel");
class TelemetryTransport extends winston.Transport {
    constructor(options) {
        super(options);
        this.level = options.level || 'warn';
    }
    log(level, msg, meta, callback) {
        const logLevel = loglevel_1.LogLevel[level];
        if (logLevel === undefined || logLevel > loglevel_1.LogLevel[this.level]) {
            return;
        }
        try {
            vscode_extension_telemetry_wrapper_1.TelemetryWrapper.sendTelemetryEvent(this.toTelemetryEvent(logLevel), Object.assign({ message: msg }, meta));
        }
        catch (telemetryErr) {
            Logger.error('Failed to send telemetry event. error: ' + telemetryErr);
        }
        super.emit('logged');
        if (callback) {
            callback(null, true);
        }
    }
    toTelemetryEvent(level) {
        switch (level) {
            case loglevel_1.LogLevel.error:
                return Constants.TELEMETRY_EXCEPTION_SCOPE;
            case loglevel_1.LogLevel.warn:
                return Constants.TELEMETRY_WARN_SCOPE;
            case loglevel_1.LogLevel.info:
            default:
                return Constants.TELEMETRY_INFO_SCOPE;
        }
    }
}
exports.TelemetryTransport = TelemetryTransport;
//# sourceMappingURL=telemetryTransport.js.map