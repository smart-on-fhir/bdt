import { Console } from "./Console";
import { Test, TestStatus } from "./Test";
import { bdt } from "../../types";
export declare class TestAPI {
    protected test: Test;
    console: Console;
    readonly abortController: AbortController;
    constructor(test: Test);
    /**
     * Sets the status of this test
     */
    setStatus(status: TestStatus): void;
    /**
     * Calling this method will mark the test as not supported.
     */
    setNotSupported(message?: string): void;
    /**
     * Provide one or more conditions to check for. If `condition.assertion`
     * evaluates to false, then new `NotSupportedError` will be thrown with
     * `condition.message` as its message.
     * @param conditions
     * @returns void
     * @throws NotSupportedError
     */
    prerequisite(...conditions: bdt.Prerequisite[]): void;
    after(fn: bdt.TestCallbackFn): void;
}
