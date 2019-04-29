import { Disposable, StatusBarItem } from 'vscode';
export default class RPCClient implements Disposable {
    statusBarIcon: StatusBarItem;
    config: import("vscode").WorkspaceConfiguration;
    private _rpc;
    private readonly _activity;
    private readonly _clientId;
    constructor(clientId: string, statusBarIcon: StatusBarItem);
    readonly client: any;
    setActivity(workspaceElapsedTime?: boolean): void;
    allowSpectate(): Promise<void>;
    disableSpectate(): Promise<void>;
    allowJoinRequests(): Promise<void>;
    disableJoinRequests(): Promise<void>;
    login(): Promise<void>;
    dispose(): Promise<void>;
}
