"use strict";
/**
 * This module defines the external API for the extension. Other
 * extensions can access this API via the exports instance for the extension.
 *
 * Look at the `CMakeToolsAPI` interface for the actual exported API.
 *
 * Copy the `api.ts` source file into your project to use it.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The type of a CMake cache entry
 */
var CacheEntryType;
(function (CacheEntryType) {
    CacheEntryType[CacheEntryType["Bool"] = 0] = "Bool";
    CacheEntryType[CacheEntryType["String"] = 1] = "String";
    CacheEntryType[CacheEntryType["Path"] = 2] = "Path";
    CacheEntryType[CacheEntryType["FilePath"] = 3] = "FilePath";
    CacheEntryType[CacheEntryType["Internal"] = 4] = "Internal";
    CacheEntryType[CacheEntryType["Uninitialized"] = 5] = "Uninitialized";
    CacheEntryType[CacheEntryType["Static"] = 6] = "Static";
})(CacheEntryType = exports.CacheEntryType || (exports.CacheEntryType = {}));
//# sourceMappingURL=api.js.map