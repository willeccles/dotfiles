"use strict";
/**
 * Module providing "strands," serialized execution in an asychronous world.
 */ /** */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Provides serial execution for asynchronous code. Here are the semantics:
 *
 * `Strand` holds an internal execution queue of completion callbacks. Each
 * call to `execute` will push to the queue. When a callback in the queue
 * finishes with either an exception or a regular return, the next callback in
 * the queue will be dispatched. Callbacks are not executed until all prior
 * callbacks have run to completion.
 */
class Strand {
    constructor() {
        this._tailPromise = Promise.resolve();
    }
    _enqueue(fn) {
        this._tailPromise = this._tailPromise.then(() => fn(), () => fn());
    }
    execute(func) {
        return new Promise((resolve, reject) => {
            this._enqueue(async () => {
                try {
                    const result = await Promise.resolve(func());
                    resolve(result);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
}
exports.Strand = Strand;
//# sourceMappingURL=strand.js.map