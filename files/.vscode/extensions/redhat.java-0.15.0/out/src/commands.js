'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Commonly used commands
 */
var Commands;
(function (Commands) {
    /**
     * Open Browser
     */
    Commands.OPEN_BROWSER = 'vscode.open';
    /**
     * Open Output view
     */
    Commands.OPEN_OUTPUT = 'java.open.output';
    /**
     * Show Java references
     */
    Commands.SHOW_JAVA_REFERENCES = 'java.show.references';
    /**
     * Show Java implementations
     */
    Commands.SHOW_JAVA_IMPLEMENTATIONS = 'java.show.implementations';
    /**
     * Show editor references
     */
    Commands.SHOW_REFERENCES = 'editor.action.showReferences';
    /**
     * Update project configuration
     */
    Commands.CONFIGURATION_UPDATE = 'java.projectConfiguration.update';
    /**
     * Ignore "Incomplete Classpath" messages
     */
    Commands.IGNORE_INCOMPLETE_CLASSPATH = 'java.ignoreIncompleteClasspath';
    /**
     * Open help for "Incomplete Classpath" message
     */
    Commands.IGNORE_INCOMPLETE_CLASSPATH_HELP = 'java.ignoreIncompleteClasspath.help';
    /**
     * Reload VS Code window
     */
    Commands.RELOAD_WINDOW = 'workbench.action.reloadWindow';
    /**
     * Set project configuration update mode
     */
    Commands.PROJECT_CONFIGURATION_STATUS = 'java.projectConfiguration.status';
    /**
     * Apply Workspace Edit
     */
    Commands.APPLY_WORKSPACE_EDIT = 'java.apply.workspaceEdit';
    /**
     * Execute Workspace Command
     */
    Commands.EXECUTE_WORKSPACE_COMMAND = 'java.execute.workspaceCommand';
    /**
     * Execute Workspace build (compilation)
     */
    Commands.COMPILE_WORKSPACE = 'java.workspace.compile';
    /**
    * Open Java Language Server Log file
    */
    Commands.OPEN_SERVER_LOG = 'java.open.serverLog';
    /**
     * Organize Java file imports command from language server
     */
    Commands.EDIT_ORGANIZE_IMPORTS = 'java.edit.organizeImports';
})(Commands = exports.Commands || (exports.Commands = {}));
//# sourceMappingURL=commands.js.map