import { Disposable, StatusBarItem } from 'vscode';
export default class RPCClient implements Disposable {
    statusBarIcon: StatusBarItem;
    config: import("vscode").WorkspaceConfiguration;
    private _rpc;
    private _activity;
    private _clientId;
    constructor(clientId: string, statusBarIcon: StatusBarItem);
    readonly client: any;
    setActivity(workspaceElapsedTime?: boolean): void;
    login(): Promise<void>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=RPCClient.d.ts.map