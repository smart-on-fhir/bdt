"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = exports.suite = exports.afterEach = exports.beforeEach = exports.after = exports.before = exports.bdt = void 0;
const slug_1 = __importDefault(require("slug"));
const glob_1 = require("glob");
const path_1 = __importDefault(require("path"));
const TestRunner_1 = __importDefault(require("./TestRunner"));
const stdout_1 = __importDefault(require("../reporters/stdout"));
const json_stream_1 = __importDefault(require("../reporters/json-stream"));
const console_1 = __importDefault(require("../reporters/console"));
const globalContext_1 = __importDefault(require("./globalContext"));
const Test_1 = require("./Test");
const Suite_1 = require("./Suite");
const Version_1 = require("./Version");
const globalContext = globalContext_1.default;
const reporters = {
    console: console_1.default,
    stdout: stdout_1.default,
    json: json_stream_1.default
};
async function bdt(options) {
    // settings ----------------------------------------------------------------
    const config = options;
    // try {
    //     Object.assign(settings, require(Path.resolve(__dirname, APP.config)));
    // } catch (ex) {
    //     console.error(`Failed to load settings from "${APP.config}". ${ex.message}`);
    //     process.exit(1);
    // }
    // load --------------------------------------------------------------------
    load(options.pattern);
    let node = getPath(options.path || "");
    if (node) {
        if (options.list) {
            if (options.apiVersion) {
                node = filterByVersion(node.toJSON(), options.apiVersion);
            }
            console.log(JSON.stringify(node, null, 4));
        }
        else {
            // runner ------------------------------------------------------------------
            const runner = new TestRunner_1.default(config, !!globalContext.onlyMode);
            // reporter ----------------------------------------------------------------
            reporters[options.reporter](runner, config.reporterOptions);
            await runner.run(node);
        }
    }
    return globalContext.root;
}
exports.bdt = bdt;
function load(pattern) {
    globalContext.root = new Suite_1.Suite({ name: "__ROOT__", path: "" });
    globalContext.currentGroup = globalContext.root;
    globalContext.onlyMode = false;
    const paths = glob_1.sync(pattern);
    paths.forEach((file) => {
        const fullPath = path_1.default.resolve(file);
        try {
            require(fullPath);
        }
        catch (e) {
            console.log(`No tests could be loaded from ${fullPath}. ${e.stack}`);
        }
    });
    return globalContext.root;
}
/**
 * Given a path (which is a dot-separated list of indexes), finds and returns
 * the node at that path. For example getPath("2.1.5") will return the sixth
 * child of the second child of the third child of the root node.
 */
function getPath(path = "") {
    if (!path) {
        return globalContext.root;
    }
    return path.split(".").reduce((out, i) => out && out.children ? out.children[+i] : undefined, globalContext.root);
}
function filterByVersion(node, version) {
    if (node.minVersion && new Version_1.Version(node.minVersion).isAbove(version)) {
        return undefined;
    }
    if (node.maxVersion && new Version_1.Version(node.maxVersion).isBelow(version)) {
        return undefined;
    }
    const out = { ...node };
    if (Array.isArray(out.children)) {
        out.children = out.children.map((child) => filterByVersion(child, version)).filter(Boolean);
    }
    return out;
}
/**
 * Register a function to be executed before a test group execution starts.
 * @param fn Can return a promise for async stuff
 */
function before(fn) {
    globalContext.currentGroup.before = fn;
}
exports.before = before;
/**
 * Register a function to be executed after a test group execution ends.
 * @param fn Can return a promise for async stuff
 */
function after(fn) {
    globalContext.currentGroup.after = fn;
}
exports.after = after;
/**
 * Register a function to be executed before a test execution starts.
 * @param fn Can return a promise for async stuff
 */
function beforeEach(fn) {
    globalContext.currentGroup.beforeEach = fn;
}
exports.beforeEach = beforeEach;
/**
 * Register a function to be executed after a test execution ends.
 * @param fn Can return a promise for async stuff
 */
function afterEach(fn) {
    globalContext.currentGroup.afterEach = fn;
}
exports.afterEach = afterEach;
/**
 * This function is called by tests. It creates new group and appends it to the
 * current group.
 * @param nameOrOptions The group name or settings object
 * @param fn The function that will be called to build the group
 */
function suite(nameOrOptions, fn) {
    if (typeof nameOrOptions === "string") {
        return suite({ name: nameOrOptions }, fn);
    }
    let group = new Suite_1.Suite({
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
exports.suite = suite;
suite.only = function (nameOrOptions, fn) {
    globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        suite({ name: nameOrOptions, only: true }, fn);
    }
    else {
        suite({ ...nameOrOptions, only: true }, fn);
    }
};
/**
 * The `it` function that will be made available to tests. It will simply
 * "remember" the test by appending it to the children structure of the parent
 * group element.
 */
function test(nameOrOptions, fn) {
    if (typeof nameOrOptions === "string") {
        return test({ name: nameOrOptions }, fn);
    }
    const path = [
        globalContext.currentGroup.path,
        globalContext.currentGroup.children.length + ""
    ].filter(Boolean).join(".");
    const id = nameOrOptions.id || slug_1.default(path + "--" + nameOrOptions.name);
    globalContext.currentGroup.children.push(new Test_1.Test({
        ...nameOrOptions,
        only: nameOrOptions.only || globalContext.currentGroup.only,
        path,
        id,
        fn
    }));
}
exports.test = test;
test.only = function (nameOrOptions, fn) {
    globalContext.onlyMode = true;
    if (typeof nameOrOptions === "string") {
        test({ name: nameOrOptions, only: true }, fn);
    }
    else {
        test({ ...nameOrOptions, only: true }, fn);
    }
};
test.skip = function (nameOrOptions, fn) {
    if (typeof nameOrOptions === "string") {
        test({ name: nameOrOptions, only: true });
    }
    else {
        test({ ...nameOrOptions, only: true });
    }
};
//# sourceMappingURL=bdt.js.map