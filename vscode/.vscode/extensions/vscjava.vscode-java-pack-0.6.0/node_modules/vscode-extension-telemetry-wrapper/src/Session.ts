import * as uuid from "uuid";
import { ExitCode } from "./ExitCode";
import { ICustomEvent } from "./Interfaces";

export class Session {
    public id: string;
    public action: string;
    public exitCode?: string;
    public startAt: Date;
    public stopAt?: Date;

    public extraProperties: { [key: string]: any } = {};
    public extraMeasures: { [key: string]: any } = {};

    constructor(action: string) {
        this.id = uuid.v4();
        this.action = action;
        this.startAt = new Date();
    }

    /**
     * @deprecated
     */
    public getCustomEvent(): ICustomEvent {
        const ret: ICustomEvent = {};
        const extraPropertiesObject = Object.assign(
            {},
            ...Object.keys(this.extraProperties).map((k) => ({ [`extra.${k}`]: this.extraProperties[k] })),
        );
        const extraMeasuresObject = Object.assign(
            {},
            ...Object.keys(this.extraMeasures).map((k) => ({ [`extra.${k}`]: this.extraMeasures[k] })),
        );
        ret.properties = Object.assign(
            {},
            extraPropertiesObject,
            { sessionId: this.id, action: this.action, startAt: this.startAt },
        );
        ret.measures = Object.assign(
            {},
            extraMeasuresObject,
            { duration: (this.stopAt || new Date()).getTime() - this.startAt.getTime() },
        );
        return ret;
    }

    /**
     * @deprecated
     */
    public end(): void {
        this.stopAt = new Date();
        this.exitCode = this.exitCode || ExitCode.SUCCESS;
    }
}
