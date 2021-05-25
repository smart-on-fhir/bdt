import { TestOptions } from "./Test";
import { TestNodeOptions } from "./TestNode";
import { Suite, SetupCallbackFn, TestCallbackFn } from "./Suite";
import { NormalizedConfig } from "./Config";
export interface Config extends NormalizedConfig {
    /**
     * Bulk Data API version to test for. Example: `1.0`, `1.2.3`, `2`.
     * Defaults to `1.0.0`
     */
    apiVersion: string;
    /**
     * A glob pattern to load test files from. Defaults to
     * `testSuite\/**\/*.test.js`
     */
    pattern?: string;
    /**
     * Specify a reporter to use. Defaults to "console"
     */
    reporter?: "console" | "json" | "stdout";
    /**
     * List loaded structure instead of executing tests. Defaults to `false`.
     */
    list?: boolean;
    /**
     * Path to the test node to execute made up of zer-based indexes and dots.
     * Examples:
     * - `""` - Root node, meaning all tests (default)
     * - `1.2` - the third child of the second child of the root node
     */
    path?: string;
    /**
     * Path to the config file to load. Defaults to `./config.js`
     */
    configFile?: string;
    /**
     * Exit on first error?
     */
    bail?: boolean;
    /**
     * JS case-insensitive RegExp (as string) to run against the test name
     */
    match?: "";
    cli?: boolean;
    reporterOptions?: StdOutReporterOptions;
}
export interface StdOutReporterOptions {
    wrap?: number;
    colors?: boolean;
    verbose?: "always" | "never" | "auto";
}
export declare function bdt(options: Config): Promise<Suite>;
/**
 * Register a function to be executed before a test group execution starts.
 * @param fn Can return a promise for async stuff
 */
export declare function before<Context = Record<string, any>>(fn: SetupCallbackFn<Context>): void;
/**
 * Register a function to be executed after a test group execution ends.
 * @param fn Can return a promise for async stuff
 */
export declare function after<Context = Record<string, any>>(fn: SetupCallbackFn<Context>): void;
/**
 * Register a function to be executed before a test execution starts.
 * @param fn Can return a promise for async stuff
 */
export declare function beforeEach<Context = Record<string, any>>(fn: TestCallbackFn<Context>): void;
/**
 * Register a function to be executed after a test execution ends.
 * @param fn Can return a promise for async stuff
 */
export declare function afterEach<Context = Record<string, any>>(fn: TestCallbackFn<Context>): void;
/**
 * This function is called by tests. It creates new group and appends it to the
 * current group.
 * @param nameOrOptions The group name or settings object
 * @param fn The function that will be called to build the group
 */
export declare function suite(nameOrOptions: string | TestNodeOptions, fn: () => void): void;
export declare namespace suite {
    var only: (nameOrOptions: string | TestNodeOptions, fn: () => void) => void;
}
/**
 * The `it` function that will be made available to tests. It will simply
 * "remember" the test by appending it to the children structure of the parent
 * group element.
 */
export declare function test<Context = Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: TestCallbackFn<Context>): void;
export declare namespace test {
    var only: <Context = Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: TestCallbackFn<Context>) => void;
    var skip: <Context = Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: TestCallbackFn<Context>) => void;
}
