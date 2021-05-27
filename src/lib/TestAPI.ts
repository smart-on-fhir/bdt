import { Console } from "./Console";
import { NotSupportedError } from "./errors";
import { TestCallbackFn } from "./Suite";
import { Test, TestStatus } from "./Test";

export interface Prerequisite {

    /**
     * This will be converted to boolean and if evaluates to false
     * it means that a prerequisite requirement is not met. If
     * function, it will be called with no arguments first, and then
     * the returned value will be converted to boolean
     */
    assertion: any

    /**
     * The error message if the assertion fails
     */
    message: string
}

export class TestAPI
{
    console: Console;

    constructor(protected test: Test)
    {
        this.console = test.console
    }

    /**
     * Sets the status of this test
     */
    setStatus(status: TestStatus) {
        this.test.status = status
    }

    /**
     * Calling this method will mark the test as not supported.
     */
    setNotSupported(message = "") {
        // This test was skipped because the server does not support this functionality
        if (message) {
            this.test.console.info(message);
        }
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
    prerequisite(...conditions: Prerequisite[]) {
        for (const { assertion, message } of conditions) {
            const x = typeof assertion == "function" ? assertion() : !!assertion;
            if (!x) {
                throw new NotSupportedError(message);
            }
        }
    }

    after(fn: TestCallbackFn) {
        this.test.after = fn
    }
}
