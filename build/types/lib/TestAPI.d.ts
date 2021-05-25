import { Console } from "./Console";
import { TestCallbackFn } from "./Suite";
import { Test, TestStatus } from "./Test";
export interface Prerequisite {
    /**
     * This will be converted to boolean and if evaluates to false
     * it means that a prerequisite requirement is not met. If
     * function, it will be called with no arguments first, and then
     * the returned value will be converted to boolean
     */
    assertion: any;
    /**
     * The error message if the assertion fails
     */
    message: string;
}
export declare class TestAPI {
    protected test: Test;
    console: Console;
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
    prerequisite(...conditions: Prerequisite[]): void;
    after(fn: TestCallbackFn): void;
}
