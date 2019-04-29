"use strict";
/**
 * Module for dealing with multiple workspace directories
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@cmt/config");
const paths_1 = require("@cmt/paths");
/**
 * State attached to a directory in a workspace. Contains a config object and
 * a state management object.
 */
class DirectoryContext {
    constructor(
    /**
     * The directory path that this context corresponds to
     */
    dirPath, 
    /**
     * The configuration for the associated directory.
     */
    config, 
    /**
     * The state management object associated with the directory.
     */
    state) {
        this.dirPath = dirPath;
        this.config = config;
        this.state = state;
    }
    /**
     * Create a context object for the given path to a directory.
     * @param dir The directory for which to create a context
     * @param state The state that will be associated with the returned context
     */
    static createForDirectory(dir, state) {
        const config = config_1.ConfigurationReader.createForDirectory(dir);
        return new DirectoryContext(dir, config, state);
    }
    /**
     * The path to a CMake executable associated with this directory. This should
     * be used over `ConfigurationReader.cmakePath` because it will do additional
     * path expansion and searching.
     */
    get cmakePath() { return paths_1.default.getCMakePath(this); }
    /**
     * The CTest executable for the directory. See `cmakePath` for more
     * information.
     */
    get ctestPath() { return paths_1.default.getCTestPath(this); }
}
exports.DirectoryContext = DirectoryContext;
//# sourceMappingURL=workspace.js.map