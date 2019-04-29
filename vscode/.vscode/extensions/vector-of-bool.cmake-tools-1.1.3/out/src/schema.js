"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ajv = require("ajv");
const path = require("path");
const pr_1 = require("./pr");
const util_1 = require("./util");
async function loadSchema(filepath) {
    const schema_path = path.isAbsolute(filepath) ? filepath : path.join(util_1.thisExtensionPath(), filepath);
    const schema_data = JSON.parse((await pr_1.fs.readFile(schema_path)).toString());
    return new ajv({ allErrors: true, format: 'full' }).compile(schema_data);
}
exports.loadSchema = loadSchema;
//# sourceMappingURL=schema.js.map