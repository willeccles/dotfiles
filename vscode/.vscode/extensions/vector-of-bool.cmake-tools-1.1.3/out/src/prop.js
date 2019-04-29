"use strict";
/**
 * Module for a watchable property class
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
var FirePolicy;
(function (FirePolicy) {
    FirePolicy[FirePolicy["FireNow"] = 0] = "FireNow";
    FirePolicy[FirePolicy["FireLate"] = 1] = "FireLate";
})(FirePolicy || (FirePolicy = {}));
exports.FireNow = FirePolicy.FireNow;
exports.FireLate = FirePolicy.FireLate;
class Property {
    constructor(_value) {
        this._value = _value;
        this._emitter = new vscode.EventEmitter();
    }
    get changeEvent() {
        return (policy, cb) => {
            const event = this._emitter.event;
            const ret = event(cb);
            switch (policy) {
                case exports.FireNow:
                    cb(this._value);
                    break;
                case exports.FireLate:
                    break;
            }
            return ret;
        };
    }
    get value() { return this._value; }
    set(v) {
        this._value = v;
        this._emitter.fire(this._value);
    }
    dispose() { this._emitter.dispose(); }
}
exports.Property = Property;
//# sourceMappingURL=prop.js.map