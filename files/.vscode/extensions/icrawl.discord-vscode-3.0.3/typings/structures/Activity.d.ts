import { Disposable } from 'vscode';
interface State {
    details?: string;
    state?: string;
    startTimestamp?: number | null;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    instance?: boolean;
}
export default class Activity implements Disposable {
    private _state;
    private _config;
    private _lastKnownFile;
    readonly state: State | null;
    generate(workspaceElapsedTime?: boolean): State;
    dispose(): void;
    private _generateDetails;
    private _generateFileDetails;
}
export {};
//# sourceMappingURL=Activity.d.ts.map