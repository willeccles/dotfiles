import * as fs from "fs";
import * as uuidv4 from "uuid/v4";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import {
    DimensionEntries,
    ErrorCodes,
    ErrorEvent,
    ErrorInfo,
    ErrorType,
    EventName,
    MeasurementEntries,
    OperationEndEvent,
    OperationErrorEvent,
    OperationStartEvent,
    OperationStepEvent,
    TelemetryEvent,
} from "./event";

interface RichError extends Error {
    isUserError?: boolean;
    errorCode?: number;
}

let isDebug: boolean = false;
let reporter: TelemetryReporter;

/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 * @param debug If set as true, debug information be printed to console.
 */
export async function initializeFromJsonFile(jsonFilepath: string, debug?: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.exists(jsonFilepath, (exists) => {
            if (exists) {
                const { publisher, name, version, aiKey } = JSON.parse(fs.readFileSync(jsonFilepath, "utf-8"));
                initialize(`${publisher}.${name}`, version, aiKey, !!debug);
                return resolve();
            } else {
                return reject(new Error(`The Json file '${jsonFilepath}' does not exist.`));
            }
        });
    });
}

/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Identifier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 * @param debug If set as true, debug information be printed to console.
 */
export function initialize(extensionId: string, version: string, aiKey: string, debug?: boolean): void {
    if (reporter) {
        throw new Error("TelemetryReporter already initilized.");
    }

    if (aiKey) {
        reporter = new TelemetryReporter(extensionId, version, aiKey);
    }
    isDebug = !!debug;
}

/**
 * Mark an Error instance as a user error.
 */
export function setUserError(err: Error): void {
    (err as RichError).isUserError = true;
}

/**
 * Set custom error code or an Error instance.
 * @param errorCode A custom error code.
 */
export function setErrorCode(err: Error, errorCode: number): void {
    (err as RichError).errorCode = errorCode;
}

/**
 * Instrument callback for a command to auto send OPEARTION_START, OPERATION_END, ERROR telemetry.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
export function instrumentOperation(
    operationName: string,
    cb: (operationId: string, ...args: any[]) => any,
): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error;
        const operationId = createUuid();
        const startAt: number = Date.now();

        try {
            sendOperationStart(operationId, operationName);
            return await cb(operationId, ...args);
        } catch (e) {
            error = e;
            sendOperationError(operationId, operationName, e);
        } finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, operationName, duration, error);
        }
    };
}

/**
 * A shortcut to instrument and operation and register it as a VSCode command.
 * Note that operation Id will no longer be accessible in this approach.
 * @param command A unique identifier for the command.
 * @param cb A command handler function.
 */
export function instrumentOperationAsVsCodeCommand(command: string, cb: (...args: any[]) => any): vscode.Disposable {
    const instrumented = instrumentOperation(command, async (operationId, ...args) => await cb(...args));
    return vscode.commands.registerCommand(command, instrumented);
}

/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 */
export function sendOperationStart(operationId: string, operationName: string) {
    const event: OperationStartEvent = {
        eventName: EventName.OPERATION_START,
        operationId,
        operationName,
    };

    sendEvent(event);
}

/**
 * Send OPERATION_END event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param err An optional Error instance if occurs during the operation.
 */
export function sendOperationEnd(operationId: string, operationName: string, duration: number, err?: Error) {
    const event: OperationEndEvent = {
        eventName: EventName.OPERATION_END,
        operationId,
        operationName,
        duration,
        ...extractErrorInfo(err),
    };

    sendEvent(event);
}

/**
 * Send an ERROR event.
 * @param err An Error instance.
 */
export function sendError(err: Error) {
    const event: ErrorEvent = {
        eventName: EventName.ERROR,
        ...extractErrorInfo(err),
    };

    sendEvent(event);
}

/**
 * Send an ERROR event during an operation, carrying id and name of the oepration.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param err An Error instance containing details.
 */
export function sendOperationError(operationId: string, operationName: string, err: Error) {
    const event: OperationErrorEvent = {
        eventName: EventName.ERROR,
        operationId,
        operationName,
        ...extractErrorInfo(err),
    };

    sendEvent(event);
}

 /**
  * Send an INFO event during an operation.
  * @param operationId Unique id of the operation.
  * @param data Values of string type go to customDimensions, values of number type go to customMeasurements.
  */
export function sendInfo(operationId: string, data: { [key: string]: string | number }): void;

/**
 * Send an INFO event during an operation.
 * Note that: operationId will overwrite dimensions['operationId'] if it exists.
 * @param operationId Unique id of the operation.
 * @param dimensions The object recorded as customDimensions.
 * @param measurements The object recored as customMeasurements.
 */
export function sendInfo(
    operationId: string,
    dimensions: { [key: string]: string },
    measurements: { [key: string]: number },
): void;

/**
 * Implementation of sendInfo.
 */
export function sendInfo(
    operationId: string,
    dimensionsOrMeasurements: { [key: string]: string } | { [key: string]: string | number },
    optionalMeasurements?: { [key: string]: number },
): void {
    let dimensions: { [key: string]: string };
    let measurements: { [key: string]: number };

    if (optionalMeasurements) {
        dimensions = dimensionsOrMeasurements as { [key: string]: string };
        measurements = optionalMeasurements;
    } else {
        dimensions = {};
        measurements = {};
        for (const key in dimensionsOrMeasurements) {
            if (typeof dimensionsOrMeasurements[key] === "string") {
                dimensions[key] = dimensionsOrMeasurements[key] as string;
            } else if (typeof dimensionsOrMeasurements[key] === "number") {
                measurements[key] = dimensionsOrMeasurements[key] as number;
            } else {
                // discard unsupported types.
            }
        }
    }

    sendTelemetryEvent(EventName.INFO, { ...dimensions, operationId }, measurements);
}

/**
 * Instrument callback for a procedure (regarded as a step in an operation).
 * @param operationId A unique identifier for the operation to which the step belongs.
 * @param stepName Name of the step.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
export function instrumentOperationStep(
    operationId: string,
    stepName: string,
    cb: (...args: any[]) => any,
): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error;
        const startAt: number = Date.now();

        try {
            return await cb(...args);
        } catch (e) {
            error = e;
            throw e;
        } finally {
            const event: OperationStepEvent = {
                eventName: EventName.OPERATION_STEP,
                operationId,
                stepName,
                duration: Date.now() - startAt,
                ...extractErrorInfo(error),
            };

            sendEvent(event);
        }
    };
}

/**
 * Create a UUID string using uuid.v4().
 */
export function createUuid(): string {
    return uuidv4();
}

/**
 * Dispose the reporter.
 */
export async function dispose(): Promise<any> {
    if (reporter) {
        return await reporter.dispose();
    }
}
function extractErrorInfo(err?: Error): ErrorInfo {
    if (!err) {
        return {
            errorCode: ErrorCodes.NO_ERROR,
        };
    }

    const richError = err as RichError;
    return {
        errorCode: richError.errorCode || ErrorCodes.GENERAL_ERROR,
        errorType: richError.isUserError ? ErrorType.USER_ERROR : ErrorType.SYSTEM_ERROR,
        message: err.message,
        stack: err.stack,
    };
}

function sendEvent(event: TelemetryEvent) {
    if (!reporter) {
        return;
    }

    const dimensions: { [key: string]: string } = {};
    for (const key of DimensionEntries) {
        const value = (event as any)[key];
        if (value !== undefined) {
            dimensions[key] = String(value);
        }
    }

    const measurements: { [key: string]: number } = {};
    for (const key of MeasurementEntries) {
        const value = (event as any)[key];
        if (value !== undefined) {
            measurements[key] = value;
        }
    }

    sendTelemetryEvent(event.eventName, dimensions, measurements);
}

function sendTelemetryEvent(
    eventName: string,
    dimensions?: {
        [key: string]: string;
    },
    measurements?: {
        [key: string]: number;
    }): void {
    reporter.sendTelemetryEvent(eventName, dimensions, measurements);
    if (isDebug) {
        // tslint:disable-next-line:no-console
        console.log(eventName, { eventName, dimensions, measurements });
    }
}
