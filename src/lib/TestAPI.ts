import { Console }           from "./Console"
import { NotSupportedError } from "./errors"
import { Test, TestStatus }  from "./Test"
import { bdt }               from "../../types"

export class TestAPI
{
    console: Console;

    readonly abortController: AbortController;

    constructor(protected test: Test)
    {
        this.console = test.console
        this.abortController = new AbortController()
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
    prerequisite(...conditions: bdt.Prerequisite[]) {
        for (const { assertion, message } of conditions) {
            const x = typeof assertion == "function" ? assertion() : !!assertion;
            if (!x) {
                throw new NotSupportedError(message);
            }
        }
    }

    after(fn: bdt.TestCallbackFn) {
        this.test.after = fn
    }
}
