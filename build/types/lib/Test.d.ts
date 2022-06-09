import { Console } from "./Console";
import { TestCallbackFn } from "./Suite";
import { TestNode, TestNodeOptions } from "./TestNode";
export interface TestOptions extends TestNodeOptions {
    id?: string;
    fn?: TestCallbackFn;
}
export declare type TestStatus = "succeeded" | "failed" | "not-supported" | "not-implemented" | "skipped";
export declare class Test extends TestNode {
    /**
     * The actual function that will be called to execute the test. If omitted
     * the test is considered "not implemented" or "todo". Can only be set once
     * while constructing the instance via the `fn` option.
     */
    readonly fn?: TestCallbackFn;
    /**
     * Each test must have unique ID. The test itself does not need this to
     * function properly. It is a metadata assigned to it by the test loader.
     * Can only be set once while constructing the instance via the `id` option.
     * If no `id` is passed, then one will be generated as slug of the path
     */
    readonly id?: string;
    private _status?;
    endedAt?: number;
    startedAt?: number;
    error?: Error;
    console: Console;
    after?: TestCallbackFn;
    constructor(options: TestOptions);
    toJSON(): Record<string, any>;
    set status(status: TestStatus);
    get status(): TestStatus;
    end(): void;
}
