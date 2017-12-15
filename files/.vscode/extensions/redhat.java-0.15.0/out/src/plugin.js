'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function collectionJavaExtensions(extensions) {
    let result = [];
    if (extensions && extensions.length) {
        for (let extension of extensions) {
            let contributesSection = extension.packageJSON['contributes'];
            if (contributesSection) {
                let javaExtensions = contributesSection['javaExtensions'];
                if (Array.isArray(javaExtensions) && javaExtensions.length) {
                    for (let javaExtensionPath of javaExtensions) {
                        result.push(path.resolve(extension.extensionPath, javaExtensionPath));
                    }
                }
            }
        }
    }
    return result;
}
exports.collectionJavaExtensions = collectionJavaExtensions;
//# sourceMappingURL=plugin.js.map