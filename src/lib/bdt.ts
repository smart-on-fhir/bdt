import Path                  from "path"
import { sync }              from "glob"
import slug                  from "slug"
import { readFileSync }      from "fs"
import Config                from "./Config"
import { Suite }             from "./Suite"
import { Test, TestOptions } from "./Test"
import TestRunner            from "./TestRunner"
import { Version }           from "./Version"
import stdoutReporter        from "../reporters/stdout"
import jsonReporter          from "../reporters/json-stream"
import consoleReporter       from "../reporters/console"
import { bdt }               from "../../types"

const reporters = {
    console: consoleReporter,
    stdout : stdoutReporter,
    json   : jsonReporter
};

interface GlobalContext {
    root?: Suite
    currentGroup?: Suite
    onlyMode?: boolean
}

type SuiteFunction = {
          (nameOrOptions: string | bdt.TestNodeOptions, fn: () => void)  : void
    only: (nameOrOptions: string | bdt.TestNodeOptions, fn: () => void) => void
}

type TestFunction = {
          <Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>)  : void
    only: <Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>) => void
    skip: <Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>) => void
}

export default class BDT
{
    globalContext: GlobalContext;

    private config: bdt.BDTOptions;

    public constructor(config?: bdt.BDTOptions)
    {
        this.globalContext = { onlyMode: false }
        this.globalContext.root = new Suite({ name: "__ROOT__", path: "" })
        this.globalContext.currentGroup = this.globalContext.root

        if (config) {
            this.configure(config)
        }
    }

    public configure(config: bdt.BDTOptions)
    {
        this.config = config
    }

    public load(path = "**/*.test.js")
    {
        this.globalContext.root = new Suite({ name: "__ROOT__", path: "" })
        this.globalContext.currentGroup = this.globalContext.root
        this.globalContext.onlyMode = false
    
        const testsDir = Path.resolve(__dirname, "../../build/testSuite")

        const paths = sync(path, { cwd: testsDir });

        if (!paths.length) {
            throw new Error(`No files were found in "${testsDir}" matching the pattern "${path}".`)
        }
        
        paths.forEach((file: string) => {
            const fullPath = Path.resolve(testsDir, file);
            try {
                const moduleWrapper = Function(
                    "exports, require, module, __filename, __dirname, suite, test, before, beforeEach, after, afterEach",
                    readFileSync(fullPath, "utf8")
                );

                moduleWrapper(
                    exports,
                    require,
                    module,
                    __filename,
                    __dirname,
                    this.suite.bind(this),
                    this.test.bind(this),
                    this.before.bind(this),
                    this.beforeEach.bind(this),
                    this.after.bind(this),
                    this.afterEach.bind(this)
                );
            }
            catch (e) {
                console.log(`No tests could be loaded from ${fullPath}.\n${e.stack}`);
            }
        });
    
        return this.globalContext.root
    }

    public list(path = "")
    {
        let node = this.getPath(path)

        if (!node) {
            throw new Error(`No test node found at path ${JSON.stringify(path)}.`);
        }

        if (this.config.apiVersion) {
            return this.filterByVersion(node.toJSON(), this.config.apiVersion)
        }

        return node.toJSON()
    }

    public createRunner()
    {
        return new TestRunner(this.config, !!this.globalContext.onlyMode, this.globalContext);
    }

    public getPath(path = ""): Test | Suite | undefined
    {
        if (!path) {
            return this.globalContext.root;
        }

        return path.split(".").reduce(
            (out, i) => out && out.children ? out.children[+i] : undefined,
            this.globalContext.root
        );
    }

    public filterByVersion(node: Record<string, any>, version: string | Version): Record<string, any>
    {
        if (node.minVersion && new Version(node.minVersion).isAbove(version)) {
            return undefined
        }

        if (node.maxVersion && new Version(node.maxVersion).isBelow(version)) {
            return undefined
        }
        
        if (Array.isArray(node.children)) {
            const out = { ...node, children: [] as any[] }
            node.children.forEach(child => {
                const result = this.filterByVersion(child, version)
                if (result) {
                    out.children.push(result)
                }
            })
            return out
        }

        return node
    }

    /**
     * This function is called by tests. It creates new group and appends it to
     * the current group.
     * @param nameOrOptions The group name or settings object
     * @param fn The function that will be called to build the group
     */
    public suite(nameOrOptions: string | bdt.TestNodeOptions, fn: () => void): void {
        if (typeof nameOrOptions === "string") {
            return this.suite({ name: nameOrOptions }, fn);
        }

        let group = new Suite({
            ...nameOrOptions,
            only: nameOrOptions.only || this.globalContext.currentGroup.only,
            path: [
                this.globalContext.currentGroup.path,
                this.globalContext.currentGroup.children.length + ""
            ].filter(Boolean).join(".")
        });
        
        this.globalContext.currentGroup.children.push(group);
        const parent = this.globalContext.currentGroup;
        this.globalContext.currentGroup = group;
        fn();
        this.globalContext.currentGroup = parent;
    }

    /**
     * The `it` function that will be made available to tests. It will simply
     * "remember" the test by appending it to the children structure of the parent
     * group element.
     */
    public test<Context extends bdt.JSONObject>(
        nameOrOptions: string | Omit<TestOptions, "fn">,
        fn?: bdt.TestCallbackFn<Context>
    ): void {
        if (typeof nameOrOptions === "string") {
            return this.test({ name: nameOrOptions }, fn);
        }

        const path = [
            this.globalContext.currentGroup.path,
            this.globalContext.currentGroup.children.length + ""
        ].filter(Boolean).join(".");
        const id = nameOrOptions.id || slug(path + "--" + nameOrOptions.name)

        this.globalContext.currentGroup.children.push(new Test({
            ...nameOrOptions,
            only: nameOrOptions.only || this.globalContext.currentGroup.only,
            path,
            id,
            fn
        }));
    }

    /**
     * Register a function to be executed before a test group execution starts.
     * @param fn Can return a promise for async stuff
     */
    public before<Context extends bdt.JSONObject>(fn: bdt.SetupCallbackFn<Context>) {
        this.globalContext.currentGroup.before = fn;
    }

    /**
     * Register a function to be executed after a test group execution ends.
     * @param fn Can return a promise for async stuff
     */
    public after<Context extends bdt.JSONObject>(fn: bdt.SetupCallbackFn<Context>) {
        this.globalContext.currentGroup.after = fn;
    }

    /**
     * Register a function to be executed before a test execution starts.
     * @param fn Can return a promise for async stuff
     */
    public beforeEach<Context extends bdt.JSONObject>(fn: bdt.TestCallbackFn<Context>) {
        this.globalContext.currentGroup.beforeEach = fn;
    }

    /**
     * Register a function to be executed after a test execution ends.
     * @param fn Can return a promise for async stuff
     */
    public afterEach<Context extends bdt.JSONObject>(fn: bdt.TestCallbackFn<Context>) {
        this.globalContext.currentGroup.afterEach = fn;
    }

    // STATIC METHODS
    // -------------------------------------------------------------------------

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
    public static async loadConfigFile(path: string, signal?: AbortSignal): Promise<bdt.NormalizedConfig>
    {
        const configPath = Path.resolve(process.cwd(), path);
        try {
            const options = require(configPath)
            try {
                await Config.validate(options, signal)
            } catch (ex) {
                const message = `Found some errors in your configuration file. ` +
                    `Please fix them first.\n${ex.message}`;
                throw new Error(message)
            }
            const config = new Config(options)
            return await config.normalize(signal);
        } catch (ex) {
            throw new Error(
                `Failed to load settings from "${configPath}".\n${ex.message}`
            );
        }
    }

    /**
     * To get the tests list one needs to create new bdt instance, load the
     * tests, find the right node and filter it's children by version. This
     * method does all that in a single call
     * @param [options]
     * @param [options.path] The node path if any (e.g.: "1.2.3")
     * @param [options.pattern] A glob pattern matching the test file names
     * @param [options.apiVersion] To limit the results to that Api version 
     */
    public static list({ path, apiVersion, pattern }: { path?: string, apiVersion?: string, pattern?: string } = {}) {
        const bdt = new BDT();
        bdt.load(pattern);
        const node = bdt.getPath(path).toJSON();
        const filtered = bdt.filterByVersion(node, apiVersion);
        if (!path) {
            return filtered.children
        }
        return filtered
    }

    public static async test({
        config,
        path = "",
        pattern, // = "**/*.test.js",
        reporter,
        reporterOptions = {}
    }: {
        config: bdt.BDTOptions
        path?: string
        pattern?: string
        reporter?: keyof typeof reporters
        reporterOptions?: {
            wrap?: number
            colors?: boolean
            verbose?: "always" | "never" | "auto"
        }
    }) {
        const bdt = new BDT(config);
        bdt.load(pattern);
        const node = bdt.getPath(path);
        const runner = bdt.createRunner();
        if (reporter) reporters[reporter](runner, reporterOptions);
        await runner.run(node);
        return node
        // return { node, runner, bdt }
    }
}

// suite.only
(BDT.prototype.suite as SuiteFunction).only = function(
    nameOrOptions: string | bdt.TestNodeOptions,
    fn: () => void
): void {
    this.globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        this.suite({ name: nameOrOptions, only: true }, fn);
    } else {
        this.suite({ ...nameOrOptions, only: true }, fn);
    }
};

// test.only
(BDT.prototype.suite as TestFunction).only = function<Context=Record<string, any>>(
    nameOrOptions: string | Omit<TestOptions, "fn">,
    fn?: bdt.TestCallbackFn<Context>
): void {
    this.globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        this.test({ name: nameOrOptions, only: true }, fn);
    } else {
        this.test({ ...nameOrOptions, only: true }, fn);
    }
};

// suite.skip
(BDT.prototype.suite as TestFunction).skip = function<Context=Record<string, any>>(
    nameOrOptions: string | Omit<TestOptions, "fn">,
    fn?: bdt.TestCallbackFn<Context>
): void {
    if (typeof nameOrOptions === "string") {
        this.test({ name: nameOrOptions, only: true });
    } else {
        this.test({ ...nameOrOptions, only: true });
    }
};
