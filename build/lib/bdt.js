"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
const slug_1 = __importDefault(require("slug"));
const fs_1 = require("fs");
const Config_1 = __importDefault(require("./Config"));
const Suite_1 = require("./Suite");
const Test_1 = require("./Test");
const TestRunner_1 = __importDefault(require("./TestRunner"));
const Version_1 = require("./Version");
const stdout_1 = __importDefault(require("../reporters/stdout"));
const json_stream_1 = __importDefault(require("../reporters/json-stream"));
const console_1 = __importDefault(require("../reporters/console"));
const reporters = {
    console: console_1.default,
    stdout: stdout_1.default,
    json: json_stream_1.default
};
class BDT {
    constructor(config) {
        this.globalContext = { onlyMode: false };
        this.globalContext.root = new Suite_1.Suite({ name: "__ROOT__", path: "" });
        this.globalContext.currentGroup = this.globalContext.root;
        if (config) {
            this.configure(config);
        }
    }
    configure(config) {
        this.config = config;
    }
    load(path = "**/*.test.js") {
        this.globalContext.root = new Suite_1.Suite({ name: "__ROOT__", path: "" });
        this.globalContext.currentGroup = this.globalContext.root;
        this.globalContext.onlyMode = false;
        const testsDir = path_1.default.resolve(__dirname, "../../build/testSuite");
        const paths = glob_1.sync(path, { cwd: testsDir });
        if (!paths.length) {
            throw new Error(`No files were found in "${testsDir}" matching the pattern "${path}".`);
        }
        paths.forEach((file) => {
            const fullPath = path_1.default.resolve(testsDir, file);
            try {
                const moduleWrapper = Function("exports, require, module, __filename, __dirname, suite, test, before, beforeEach, after, afterEach", fs_1.readFileSync(fullPath, "utf8"));
                moduleWrapper(exports, require, module, __filename, __dirname, this.suite.bind(this), this.test.bind(this), this.before.bind(this), this.beforeEach.bind(this), this.after.bind(this), this.afterEach.bind(this));
            }
            catch (e) {
                console.log(`No tests could be loaded from ${fullPath}.\n${e.stack}`);
            }
        });
        return this.globalContext.root;
    }
    list(path = "") {
        let node = this.getPath(path);
        if (!node) {
            throw new Error(`No test node found at path ${JSON.stringify(path)}.`);
        }
        if (this.config.apiVersion) {
            return this.filterByVersion(node.toJSON(), this.config.apiVersion);
        }
        return node.toJSON();
    }
    createRunner() {
        return new TestRunner_1.default(this.config, !!this.globalContext.onlyMode, this.globalContext);
    }
    getPath(path = "") {
        if (!path) {
            return this.globalContext.root;
        }
        return path.split(".").reduce((out, i) => out && out.children ? out.children[+i] : undefined, this.globalContext.root);
    }
    filterByVersion(node, version) {
        if (node.minVersion && new Version_1.Version(node.minVersion).isAbove(version)) {
            return undefined;
        }
        if (node.maxVersion && new Version_1.Version(node.maxVersion).isBelow(version)) {
            return undefined;
        }
        if (Array.isArray(node.children)) {
            const out = { ...node, children: [] };
            node.children.forEach(child => {
                const result = this.filterByVersion(child, version);
                if (result) {
                    out.children.push(result);
                }
            });
            return out;
        }
        return node;
    }
    /**
     * This function is called by tests. It creates new group and appends it to
     * the current group.
     * @param nameOrOptions The group name or settings object
     * @param fn The function that will be called to build the group
     */
    suite(nameOrOptions, fn) {
        if (typeof nameOrOptions === "string") {
            return this.suite({ name: nameOrOptions }, fn);
        }
        let group = new Suite_1.Suite({
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
    test(nameOrOptions, fn) {
        if (typeof nameOrOptions === "string") {
            return this.test({ name: nameOrOptions }, fn);
        }
        const path = [
            this.globalContext.currentGroup.path,
            this.globalContext.currentGroup.children.length + ""
        ].filter(Boolean).join(".");
        const id = nameOrOptions.id || slug_1.default(path + "--" + nameOrOptions.name);
        this.globalContext.currentGroup.children.push(new Test_1.Test({
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
    before(fn) {
        this.globalContext.currentGroup.before = fn;
    }
    /**
     * Register a function to be executed after a test group execution ends.
     * @param fn Can return a promise for async stuff
     */
    after(fn) {
        this.globalContext.currentGroup.after = fn;
    }
    /**
     * Register a function to be executed before a test execution starts.
     * @param fn Can return a promise for async stuff
     */
    beforeEach(fn) {
        this.globalContext.currentGroup.beforeEach = fn;
    }
    /**
     * Register a function to be executed after a test execution ends.
     * @param fn Can return a promise for async stuff
     */
    afterEach(fn) {
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
    static async loadConfigFile(path, signal) {
        const configPath = path_1.default.resolve(process.cwd(), path);
        try {
            const options = require(configPath);
            try {
                await Config_1.default.validate(options, signal);
            }
            catch (ex) {
                const message = `Found some errors in your configuration file. ` +
                    `Please fix them first.\n${ex.message}`;
                throw new Error(message);
            }
            const config = new Config_1.default(options);
            return await config.normalize(signal);
        }
        catch (ex) {
            throw new Error(`Failed to load settings from "${configPath}".\n${ex.message}`);
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
    static list({ path, apiVersion, pattern } = {}) {
        const bdt = new BDT();
        bdt.load(pattern);
        const node = bdt.getPath(path).toJSON();
        const filtered = bdt.filterByVersion(node, apiVersion);
        if (!path) {
            return filtered.children;
        }
        return filtered;
    }
    static async test({ config, path = "", pattern, // = "**/*.test.js",
    reporter, reporterOptions = {} }) {
        const bdt = new BDT(config);
        bdt.load(pattern);
        const node = bdt.getPath(path);
        const runner = bdt.createRunner();
        if (reporter)
            reporters[reporter](runner, reporterOptions);
        await runner.run(node);
        return node;
        // return { node, runner, bdt }
    }
}
exports.default = BDT;
// suite.only
BDT.prototype.suite.only = function (nameOrOptions, fn) {
    this.globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        this.suite({ name: nameOrOptions, only: true }, fn);
    }
    else {
        this.suite({ ...nameOrOptions, only: true }, fn);
    }
};
// test.only
BDT.prototype.suite.only = function (nameOrOptions, fn) {
    this.globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        this.test({ name: nameOrOptions, only: true }, fn);
    }
    else {
        this.test({ ...nameOrOptions, only: true }, fn);
    }
};
// suite.skip
BDT.prototype.suite.skip = function (nameOrOptions, fn) {
    if (typeof nameOrOptions === "string") {
        this.test({ name: nameOrOptions, only: true });
    }
    else {
        this.test({ ...nameOrOptions, only: true });
    }
};
//# sourceMappingURL=bdt.js.map