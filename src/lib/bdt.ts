import slug                  from "slug"
import { sync }              from "glob"
import path                  from "path"
import TestRunner            from "./TestRunner"
import stdoutReporter        from "../reporters/stdout"
import jsonReporter          from "../reporters/json-stream"
import consoleReporter       from "../reporters/console"
import ctx                   from "./globalContext"
import { Test, TestOptions } from "./Test"
import { TestNodeOptions }   from "./TestNode"
import { Suite, SetupCallbackFn, TestCallbackFn } from "./Suite"
import { NormalizedConfig }  from "./Config"

export interface Config extends NormalizedConfig {

    /**
     * Bulk Data API version to test for. Example: `1.0`, `1.2.3`, `2`.
     * Defaults to `1.0.0`
     */
    apiVersion: string

    /**
     * A glob pattern to load test files from. Defaults to
     * `testSuite\/**\/*.test.js`
     */
    pattern?: string

    /**
     * Specify a reporter to use. Defaults to "console"
     */
    reporter?: "console" | "json" | "stdout"

    /**
     * List loaded structure instead of executing tests. Defaults to `false`.
     */
    list?: boolean

    /**
     * Path to the test node to execute made up of zer-based indexes and dots.
     * Examples:
     * - `""` - Root node, meaning all tests (default)
     * - `1.2` - the third child of the second child of the root node
     */
    path?: string

    /**
     * Path to the config file to load. Defaults to `./config.js`
     */
    configFile?: string

    /**
     * Exit on first error?
     */
    bail?: boolean

    /**
     * JS case-insensitive RegExp (as string) to run against the test name
     */
    match?: ""

    cli?: boolean

    reporterOptions?: StdOutReporterOptions
}

export interface StdOutReporterOptions {
    wrap?: number
    colors?: boolean
    verbose?: "always" | "never" | "auto"
}

const globalContext = ctx as GlobalContext

const reporters = {
    console: consoleReporter,
    stdout : stdoutReporter,
    json   : jsonReporter
};


export async function bdt(options: Config): Promise<Suite>
{
    // settings ----------------------------------------------------------------
    const config: Config = options
    // try {
    //     Object.assign(settings, require(Path.resolve(__dirname, APP.config)));
    // } catch (ex) {
    //     console.error(`Failed to load settings from "${APP.config}". ${ex.message}`);
    //     process.exit(1);
    // }

    // load --------------------------------------------------------------------
    load(options.pattern)

    // runner ------------------------------------------------------------------
    const runner = new TestRunner(config, !!globalContext.onlyMode);

    // reporter ----------------------------------------------------------------
    reporters[options.reporter](runner, config.reporterOptions);

    if (options.list) {
        // console.log()
    } else {
        await runner.run(globalContext.root)
    }

    return globalContext.root
}

interface GlobalContext {
    root?: Suite
    currentGroup?: Suite
    onlyMode?: boolean
}

function load(pattern: string): Suite
{
    globalContext.root = new Suite({ name: "__ROOT__", path: "" })
    globalContext.currentGroup = globalContext.root
    globalContext.onlyMode = false

    const paths = sync(pattern);
    paths.forEach((file: string) => {
        const fullPath = path.resolve(file);
        try {
            require(fullPath);
        }
        catch (e) {
            console.log(`No tests could be loaded from ${fullPath}. ${e.stack}`);
        }
    });

    return globalContext.root
}

/**
 * Register a function to be executed before a test group execution starts.
 * @param fn Can return a promise for async stuff
 */
export function before<Context=Record<string, any>>(fn: SetupCallbackFn<Context>) {
    globalContext.currentGroup.before = fn;
}

/**
 * Register a function to be executed after a test group execution ends.
 * @param fn Can return a promise for async stuff
 */
export function after<Context=Record<string, any>>(fn: SetupCallbackFn<Context>) {
    globalContext.currentGroup.after = fn;
}

/**
 * Register a function to be executed before a test execution starts.
 * @param fn Can return a promise for async stuff
 */
export function beforeEach<Context=Record<string, any>>(fn: TestCallbackFn<Context>) {
    globalContext.currentGroup.beforeEach = fn;
}

/**
 * Register a function to be executed after a test execution ends.
 * @param fn Can return a promise for async stuff
 */
export function afterEach<Context=Record<string, any>>(fn: TestCallbackFn<Context>) {
    globalContext.currentGroup.afterEach = fn;
}

/**
 * This function is called by tests. It creates new group and appends it to the
 * current group.
 * @param nameOrOptions The group name or settings object
 * @param fn The function that will be called to build the group
 */
export function suite(nameOrOptions: string | TestNodeOptions, fn: () => void): void {
    if (typeof nameOrOptions === "string") {
        return suite({ name: nameOrOptions }, fn);
    }

    let group = new Suite({
        ...nameOrOptions,
        only: nameOrOptions.only || globalContext.currentGroup.only,
        path: [
            globalContext.currentGroup.path,
            globalContext.currentGroup.children.length + ""
        ].filter(Boolean).join(".")
    });
    
    globalContext.currentGroup.children.push(group);
    const parent = globalContext.currentGroup;
    globalContext.currentGroup = group;
    fn();
    globalContext.currentGroup = parent;
}

suite.only = function(nameOrOptions: string | TestNodeOptions, fn: () => void): void
{
    globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        suite({ name: nameOrOptions, only: true }, fn);
    } else {
        suite({ ...nameOrOptions, only: true }, fn);
    }
};
 
/**
 * The `it` function that will be made available to tests. It will simply
 * "remember" the test by appending it to the children structure of the parent
 * group element.
 */
export function test<Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: TestCallbackFn<Context>): void {
    if (typeof nameOrOptions === "string") {
        return test({ name: nameOrOptions }, fn);
    }

    const path = [
        globalContext.currentGroup.path,
        globalContext.currentGroup.children.length + ""
    ].filter(Boolean).join(".");
    const id = nameOrOptions.id || slug(path + "--" + nameOrOptions.name)

    globalContext.currentGroup.children.push(new Test({
        ...nameOrOptions,
        only: nameOrOptions.only || globalContext.currentGroup.only,
        path,
        id,
        fn
    }));
}
 
test.only = function<Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: TestCallbackFn<Context>): void
{
    globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        test({ name: nameOrOptions, only: true }, fn);
    } else {
        test({ ...nameOrOptions, only: true }, fn);
    }
};

test.skip = function<Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: TestCallbackFn<Context>): void
{
    if (typeof nameOrOptions === "string") {
        test({ name: nameOrOptions, only: true });
    } else {
        test({ ...nameOrOptions, only: true });
    }
};
