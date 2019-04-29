[![npm Package](https://img.shields.io/npm/v/vscode-extension-telemetry-wrapper.svg)](https://www.npmjs.org/package/vscode-extension-telemetry-wrapper)
[![License](https://img.shields.io/npm/l/express.svg)](https://github.com/eskibear/vscode-extension-telemetry-wrapper/blob/master/LICENSE)
[![downloads per month](https://img.shields.io/npm/dm/vscode-extension-telemetry-wrapper.svg)](https://www.npmjs.org/package/vscode-extension-telemetry-wrapper)

Inject code to send telemetry to Application Insight when register commands.

## Version map
|vscode-extension-telemetry-wrapper|vscode-extension-telemetry| 
|---|---|
|~0.3.4|^0.1.0|
|~0.3.2|^0.0.22|
|0.3.1|^0.0.18|
|0.2.4|^0.0.18|
|~~0.2.3 (Deprecated)~~|~~^0.0.17~~|
|0.2.2|^0.0.17|
|0.2.1|0.0.10|
|~0.1.0|0.0.10|


## Usage for 0.3.x
### Examples
- Initialize the wrapper on activation.
    ```ts
    import { initialize, instrumentOperation } from "vscode-extension-telemetry-wrapper";
    export async function activate(context: vscode.ExtensionContext): Promise<void> {
        // initialize the wrapper.
        await initialize(extensionId, extensionVersion, aiKey);

        // It instruments the activate operation to send related events.
        await instrumentOperation("activation", doActivate)(context);
    }

    async function doActivate(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
        // Move your code here.
    }
    ```

- Instrument your VS Code command.
    ```ts
    const name = "my.hello";
    const myHello = (...args) => {
        vscode.window.showInformationMessage("Hello: " + args.join(" "));
    };

    // without the wrapper
    const myCommand = vscode.commands.registerCommand(name, myHello);

    // with the wrapper
    const myCommand = instrumentOperationAsVsCodeCommand(name, myHello);
    ```

- Instrument an operation with multiple steps.
    ```ts
    const name = "my.multiStepTask";
    const step1 = () => {
        vscode.window.showInformationMessage("Step 1: Start.");
    }
    const step2 = (...args) => {
        vscode.window.showInformationMessage("Step 2: " + args.join(" "));
    }

    // without the wrapper.
    const multiStepTask = (...args) => {
        step1();
        step2(..args);
    };
    vscode.commands.registerCommand(name, multiStepTask);

    // with the wrapper. 
    // operationId contains a unique Id for each execution of the task.
    const instrumentedMultiStepTask = instrumentOperation(name, (operationId, ...args) => {
        instrumentOperationStep(operationId, "step1", step1)();
        instrumentOperationStep(operationId, "step2", step2)(...args);
    });
    vscode.commands.registerCommand(name, instrumentedMultiStepTask);
    ```

- Mark an Error as user error.
    ```ts
    try {
        // ...
    } catch (err: Error) {
        setUserError(err);
        // do something with the user error.
        throw(err);
    }
    ```

- Set error code for an Error.
    ```ts
    try {
        // ...
    } catch (err: Error) {
        // The error code should be a non-zero integer. 
        const ERROR_FILE_NOT_FOUND = 2;
        setErrorCode(err, ERROR_FILE_NOT_FOUND);
        throw(err);
    }
    ```

### Exported APIs

<details><summary>Initialize.</summary>

```typescript
/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 */
function initializeFromJsonFile(jsonFilepath: string, _debug?: boolean): Promise<void>;

/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Identifier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 */
function initialize(extensionId: string, version: string, aiKey: string, _debug?: boolean): void;
```
</details>

<details><summary>Instrumentation.</summary>

* Instrument an operation.
```typescript
/**
 * Instrument callback for a command to auto send OPEARTION_START, OPERATION_END, ERROR telemetry.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
function instrumentOperation(operationName: string, cb: (_operationId: string, ...args: any[]) => any): (...args: any[]) => any;
```

* Instrument a VS Code command.
```ts
/**
 * A shortcut to instrument and operation and register it as a VSCode command.
 * Note that operation Id will no longer be accessible in this approach.
 * @param command A unique identifier for the command.
 * @param cb A command handler function.
 */
export function instrumentOperationAsVsCodeCommand(command: string, cb: (...args: any[]) => any): vscode.Disposable;
```
</details>

<details><summary>Mark on an Error.</summary>

```typescript
/**
 * Mark an Error instance as a user error.
 */
function setUserError(err: Error): void;

/**
 * Set custom error code or an Error instance.
 * @param errorCode A custom error code.
 */
function setErrorCode(err: Error, errorCode: number): void;
```
</details>

<details><summary>Send events.</summary>

```ts
/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 */
function sendOperationStart(operationId: string, operationName: string): void;

/**
 * Send OPERATION_END event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param err An optional Error instance if occurs during the operation.
 */
function sendOperationEnd(operationId: string, operationName: string, duration: number, err?: Error): void;

/**
 * Send an ERROR event.
 * @param err An Error instance.
 */
export declare function sendError(err: Error): void;

/**
 * Send an ERROR event during an operation, carrying id and name of the oepration.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param err An Error instance containing details.
 */
function sendOperationalError(operationId: string, operationName: string, err: Error): void;

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
    measurements: { [key: string]: number }
): void;
```

</details>

<details><summary>Create a Unique Id.</summary>

```ts
/**
 * Create a UUID string using uuid.v4().
 */
function createUuid(): string;
```
</details>

## Usage for 0.2.x (Will be deprecated since 0.4.0)

It sends `commandStart` and `commandEnd` for execution of each the command.

<details>
<summary>Examples.</summary>

```
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";

// initialize with specific parameters
TelemetryWrapper.initilize(publisher, extensionName, version, aiKey);

// or directly from Json file, e.g. package.json
TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("./package.json"));
```

For compatibility, the legacy `TelemetryReporter` can be accessed by `TelemetryWrapper.getReporter()`.


### Previous without wrapper

```
export function activate(context: vscode.ExtensionContext): void {

    vscode.commands.registerCommand("commandName", 
        (args: any[]): void => {
            // TODO
        }
    );

}
```

### Now

**Basic usage**

```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName",
        (args: any[]): void => {
            // TODO
        }
    );

}
```

**Send custom usage data during the session**
```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName",
        (args: any[]): void => {
            // TODO: initialize
            TelemetryWrapper.sendTelemetryEvent(“initializeDone”);
            // TODO: pre tasks
            TelemetryWrapper.sendTelemetryEvent("preTasksDone");
            // TODO: final tasks
        }
    );

}
```

Result:

* publisher.extension/commandStart      {sessionId: xxx}
* publisher.extension/initilizeDone     {sessionId: xxx}
* publisher.extension/preTasksDone      {sessionId: xxx}
* publisher.extension/commandEnd        {sessionId: xxx, exitCode: 0}


**Send custom usage data with different log level**
```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName",
        (args: any[]): void => {
            // TODO: initialize
            TelemetryWrapper.info(“initializeDone”);
            // TODO: pre tasks with error
            TelemetryWrapper.error("preTasksNotDone");
            // TODO: final tasks
        }
    );
}
```
Result:

* publisher.extension/commandStart      {sessionId: xxx}
* publisher.extension/info              {message: "initilizeDone", logLevel: 400, sessionId: xxx}
* publisher.extension/error             {message: "preTasksDone", logLevel: 200, sessionId: xxx}
* publisher.extension/commandEnd        {sessionId: xxx, exitCode: 1}


**Inject customized properties into the a session**
```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName",
        (args: any[]): void => {
            const t = TelemetryWrapper.currentSession();
            t.extraProperties.finishedSteps = [];
            // TODO: initialize
            t.extraProperties.finishedSteps.push("initialize");
            // TODO: pre tasks
            t.extraProperties.finishedSteps.push("preTasks");
            // TODO: final tasks
            t.extraProperties.finishedSteps.push("finalTasks");
        }
    );

}
```

Result:

* publisher.extension/commandStart
    ```
    {
        sessionId: xxx
    }
    ```
* publisher.extension/commandEnd
    ```
    {
        sessionId: xxx,
        exitCode: 0,
        extra.finishedSteps: [
            "initialize",
            "preTasks",
            "finalTasks"
        ]
    }
    ```


</details>


