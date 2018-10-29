import { createNamespace, Namespace } from "continuation-local-storage";
import * as fse from "fs-extra";
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { ExitCode } from "./ExitCode";
import { ICustomEvent } from "./Interfaces";
import { LogLevel } from "./LogLevel";
import { Session } from "./Session";

const SESSION_KEY: string = "session";

export namespace TelemetryWrapper {
    let reporter: TelemetryReporter;
    let sessionNamespace: Namespace;

    export async function initilizeFromJsonFile(fsPath: string): Promise<void> {
        if (await fse.pathExists(fsPath)) {
            const { publisher, name, version, aiKey } = await fse.readJSON(fsPath);
            initilize(publisher, name, version, aiKey);
        } else {
            throw new Error(`The Json file '${fsPath}' does not exist.`);
        }
    }

    export function initilize(publisher: string, name: string, version: string, aiKey: string): void {
        if (reporter) {
            throw new Error("TelemetryReporter already initilized.");
        }
        if (aiKey) {
            reporter = new TelemetryReporter(`${publisher}.${name}`, version, aiKey);
            report(EventType.ACTIVATION);
        }
        if (!sessionNamespace) {
            sessionNamespace = createNamespace("sessionNamespace");
        }
    }

    export function registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable {
        return vscode.commands.registerCommand(command, async (param: any[]) => {
            await new Promise<void>((resolve, reject) => {
                sessionNamespace.run(async () => {
                    const session: Session = startSession(command);
                    sessionNamespace.set<Session>(SESSION_KEY, session);
                    report(EventType.COMMAND_START, {
                        measures: { logLevel: LogLevel.INFO },
                        properties: Object.assign({}, session.getCustomEvent().properties),
                    });
                    try {
                        await callback(param);
                        resolve();
                    } catch (error) {
                        fatal(error, ExitCode.GENERAL_ERROR);
                        reject(error);
                    } finally {
                        endSession(session);
                    }
                });
            });
        });
    }

    export function getReporter(): TelemetryReporter {
        return reporter;
    }

    export function startSession(name: string): Session {
        const trans: Session = new Session(name);
        return trans;
    }

    export function endSession(session: Session) {
        if (session) {
            session.end();
            const customEvent = session.getCustomEvent();
            report(EventType.COMMAND_END, {
                measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.INFO }),
                properties: Object.assign(
                    {},
                    customEvent.properties,
                    { stopAt: session.stopAt, exitCode: session.exitCode },
                ),
            });
        }
    }

    export function currentSession() {
        return sessionNamespace && sessionNamespace.get(SESSION_KEY);
    }

    /**
     * Send a telemetry record with event name "fatal".
     * @param message a string or a JSON string.
     * @param exitCode
     */
    export function fatal(message: string, exitCode?: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.ERROR, {
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.FATAL }),
            properties: Object.assign({}, customEvent.properties, { message }),
        });
        if (session) {
            session.exitCode = exitCode || ExitCode.GENERAL_ERROR;
        }
    }

    /**
     * Send a telemetry record with event name "error".
     * @param message a string or a JSON string.
     * @param exitCode
     */
    export function error(message: string, exitCode?: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.ERROR, {
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.ERROR }),
            properties: Object.assign({}, customEvent.properties, { message }),
        });
        if (session) {
            session.exitCode = exitCode || ExitCode.GENERAL_ERROR;
        }
    }

    /**
     * Send a telemetry record with event name "info".
     * @param message a string or a JSON string.
     * @param exitCode
     */
    export function info(message: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.INFO, {
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.INFO }),
            properties: Object.assign({}, customEvent.properties, { message }),
        });
    }

    /**
     * Send a telemetry record with event name "warn".
     * @param message a string or a JSON string.
     * @param exitCode
     */
    export function warn(message: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.WARN, {
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.WARN }),
            properties: Object.assign({}, customEvent.properties, { message }),
        });
    }

    /**
     * Send a telemetry record with event name "verbose".
     * @param message a string or a JSON string.
     * @param exitCode
     */
    export function verbose(message: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.VERBOSE, {
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.VERBOSE }),
            properties: Object.assign({}, customEvent.properties, { message }),
        });
    }

    export function sendTelemetryEvent(
        eventName: string,
        properties?: { [key: string]: string },
        measures?: { [key: string]: number },
    ): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(eventName, {
            measures: Object.assign({}, measures, customEvent.measures),
            properties: Object.assign({}, properties, customEvent.properties),
        });
    }

    export enum EventType {
        ACTIVATION = "activation",
        FATAL = "fatal",
        ERROR = "error",
        WARN = "warn",
        INFO = "info",
        VERBOSE = "verbose",
        COMMAND_START = "commandStart",
        COMMAND_END = "commandEnd",
    }

    function report(eventType: EventType | string, event?: ICustomEvent): void {
        if (reporter) {
            reporter.sendTelemetryEvent(eventType, event && event.properties, event && event.measures);
        }
    }
}
