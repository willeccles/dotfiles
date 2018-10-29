export enum EventName {
    ERROR = "error",
    INFO = "info",
    OPERATION_START = "opStart",
    OPERATION_END = "opEnd",
}

export namespace ErrorCodes {
    export const NO_ERROR: number = 0;
    export const GENERAL_ERROR: number = 1;
}

export enum ErrorType {
    USER_ERROR = "userError",
    SYSTEM_ERROR = "systemError",
}

export interface TelemetryEvent {
    eventName: EventName;
}

export interface Operation {
    operationId: string;
    operationName: string;
}

export interface ErrorInfo {
    errorCode: number;
    errorType?: ErrorType;
    message?: string;
    stack?: string;
}

export interface OperationStartEvent extends TelemetryEvent, Operation {
}

export interface OperationEndEvent extends TelemetryEvent, Operation, ErrorInfo {
    duration: number;
}

export interface OperationErrorEvent extends TelemetryEvent, Operation, ErrorInfo {
}

export interface ErrorEvent extends TelemetryEvent, ErrorInfo {

}

export const DimensionEntries: string[] = [
    "operationId",
    "operationName",
    "errorCode",
    "errorType",
    "message",
    "stack",
];

export const MeasurementEntries: string[] = [
    "duration",
];
