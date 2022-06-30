import { Suite } from "./Suite";
import { Test, TestOptions } from "./Test";
import TestRunner from "./TestRunner";
import { Version } from "./Version";
import stdoutReporter from "../reporters/stdout";
import jsonReporter from "../reporters/json-stream";
import consoleReporter from "../reporters/console";
import { bdt } from "../../types";
declare const reporters: {
    console: typeof consoleReporter;
    stdout: typeof stdoutReporter;
    json: typeof jsonReporter;
};
interface GlobalContext {
    root?: Suite;
    currentGroup?: Suite;
    onlyMode?: boolean;
}
export default class BDT {
    globalContext: GlobalContext;
    private config;
    constructor(config?: bdt.BDTOptions);
    configure(config: bdt.BDTOptions): void;
    load(path?: string): Suite;
    list(path?: string): Record<string, any>;
    createRunner(): TestRunner;
    getPath(path?: string): Test | Suite | undefined;
    filterByVersion(node: Record<string, any>, version: string | Version): Record<string, any>;
    /**
     * This function is called by tests. It creates new group and appends it to
     * the current group.
     * @param nameOrOptions The group name or settings object
     * @param fn The function that will be called to build the group
     */
    suite(nameOrOptions: string | bdt.TestNodeOptions, fn: () => void): void;
    /**
     * The `it` function that will be made available to tests. It will simply
     * "remember" the test by appending it to the children structure of the parent
     * group element.
     */
    test<Context extends bdt.JSONObject>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>): void;
    /**
     * Register a function to be executed before a test group execution starts.
     * @param fn Can return a promise for async stuff
     */
    before<Context extends bdt.JSONObject>(fn: bdt.SetupCallbackFn<Context>): void;
    /**
     * Register a function to be executed after a test group execution ends.
     * @param fn Can return a promise for async stuff
     */
    after<Context extends bdt.JSONObject>(fn: bdt.SetupCallbackFn<Context>): void;
    /**
     * Register a function to be executed before a test execution starts.
     * @param fn Can return a promise for async stuff
     */
    beforeEach<Context extends bdt.JSONObject>(fn: bdt.TestCallbackFn<Context>): void;
    /**
     * Register a function to be executed after a test execution ends.
     * @param fn Can return a promise for async stuff
     */
    afterEach<Context extends bdt.JSONObject>(fn: bdt.TestCallbackFn<Context>): void;
    /**
     * Given a path to JS configuration file:
     * 1. Resolves it relative to CWD
     * 2. Loads it using `require`
     * 3. Validates it and throws if needed
     * 4. Creates a [[Config]] object from it
     * 5. Runs the `normalize` method on that object
     * 6. Finally returns the `NormalizedConfig` object
     * @param path path to JS configuration file, relative to CWD
     * @param signal Optional AbortSignal to cancel async jobs
     */
    static loadConfigFile(path: string, signal?: AbortSignal): Promise<bdt.NormalizedConfig>;
    /**
     * To get the tests list one needs to create new bdt instance, load the
     * tests, find the right node and filter it's children by version. This
     * method does all that in a single call
     * @param [options]
     * @param [options.path] The node path if any (e.g.: "1.2.3")
     * @param [options.pattern] A glob pattern matching the test file names
     * @param [options.apiVersion] To limit the results to that Api version
     */
    static list({ path, apiVersion, pattern }?: {
        path?: string;
        apiVersion?: string;
        pattern?: string;
    }): any;
    static test({ config, path, pattern, // = "**/*.test.js",
    reporter, reporterOptions }: {
        config: bdt.BDTOptions;
        path?: string;
        pattern?: string;
        reporter?: keyof typeof reporters;
        reporterOptions?: {
            wrap?: number;
            colors?: boolean;
            verbose?: "always" | "never" | "auto";
        };
    }): Promise<Test | Suite>;
}
export {};
