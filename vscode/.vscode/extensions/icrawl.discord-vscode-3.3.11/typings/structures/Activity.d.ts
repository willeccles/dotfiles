import { Disposable } from 'vscode';
interface State {
    details?: string;
    state?: string;
    startTimestamp?: number | null;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    partyId?: string;
    partySize?: number;
    partyMax?: number;
    matchSecret?: string;
    joinSecret?: string;
    spectateSecret?: string;
    instance?: boolean;
}
export default class Activity implements Disposable {
    private _state;
    private readonly _config;
    private _lastKnownFile;
    readonly state: State | null;
    generate(workspaceElapsedTime?: boolean): State;
    allowSpectate(): Promise<State | undefined>;
    disableSpectate(): Promise<State | undefined>;
    allowJoinRequests(): Promise<State | undefined>;
    disableJoinRequests(): Promise<State | undefined>;
    changePartyId(id?: string): State | undefined;
    increasePartySize(size?: number): State | undefined;
    decreasePartySize(size?: number): State | undefined;
    dispose(): void;
    private _generateDetails;
    private _generateFileDetails;
}
export {};
