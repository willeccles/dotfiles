"use strict";
/**
 * Memoizes the creation of diagnostic collections
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
/**
 * A lazily constructed diagnostic collection object
 */
class LazyCollection {
    constructor(name) {
        this.name = name;
    }
    /**
     * Get the collection
     */
    getOrCreate() {
        if (!this._collection) {
            this._collection = vscode.languages.createDiagnosticCollection(this.name);
        }
        return this._collection;
    }
    /**
     * Dispose of the collection
     */
    dispose() {
        if (this._collection) {
            this._collection.dispose();
        }
        this._collection = undefined;
    }
}
/**
 * Class stores the diagnostic collections used by CMakeTools
 */
class Collections {
    constructor() {
        this._cmake = new LazyCollection('cmake-configure-diags');
        this._build = new LazyCollection('cmake-build-diags');
    }
    /**
     * The `DiagnosticCollection` for the CMake configure diagnostics.
     */
    get cmake() { return this._cmake.getOrCreate(); }
    /**
     * The `DiagnosticCollection` for build diagnostics
     */
    get build() { return this._build.getOrCreate(); }
    reset() {
        this._cmake.dispose();
        this._build.dispose();
    }
}
exports.collections = new Collections();
exports.default = exports.collections;
//# sourceMappingURL=collections.js.map