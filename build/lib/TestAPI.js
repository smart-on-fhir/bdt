"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAPI = void 0;
const errors_1 = require("./errors");
class TestAPI {
    constructor(test) {
        this.test = test;
        this.console = test.console;
    }
    /**
     * Sets the status of this test
     */
    setStatus(status) {
        this.test.status = status;
    }
    /**
     * Calling this method will mark the test as not supported.
     */
    setNotSupported(message = "This test was skipped because " +
        "the server does not support this functionality") {
        this.test.console.info(message);
        this.test.status = "not-supported";
    }
    /**
     * Provide one or more conditions to check for. If `condition.assertion`
     * evaluates to false, then new `NotSupportedError` will be thrown with
     * `condition.message` as its message.
     * @param conditions
     * @returns void
     * @throws NotSupportedError
     */
    prerequisite(...conditions) {
        for (const { assertion, message } of conditions) {
            const x = typeof assertion == "function" ? assertion() : !!assertion;
            if (!x) {
                throw new errors_1.NotSupportedError(message);
            }
        }
    }
    after(fn) {
        this.test.after = fn;
    }
}
exports.TestAPI = TestAPI;
//# sourceMappingURL=TestAPI.js.map