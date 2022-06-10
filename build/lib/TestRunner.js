"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const errors_1 = require("./errors");
const Test_1 = require("./Test");
const TestAPI_1 = require("./TestAPI");
const globalContext_1 = __importDefault(require("./globalContext"));
class TestRunner extends events_1.default {
    constructor(settings, onlyMode = false) {
        super();
        this.canceled = false;
        this.onlyMode = false;
        this.canceled = false;
        this.onlyMode = onlyMode;
        this.settings = settings;
    }
    async endTest(test, context, error) {
        test.endedAt = Date.now();
        if (error) {
            // Not supported
            if (error instanceof errors_1.NotSupportedError) {
                test.status = "not-supported";
                // test.console.info(error.message)
            }
            // Other errors
            else {
                test.status = "failed";
                test.console.error(error);
                // bail?
                if (this.settings.bail) {
                    this.canceled = true;
                }
            }
        }
        // test.after hook attached at runtime?
        if (test.after) {
            try {
                await test.after({ config: this.settings, api: new TestAPI_1.TestAPI(test), context });
            }
            catch (ex) {
                ex.message = "test.after hook: " + ex.message;
                test.console.error(ex);
            }
        }
        // group.afterEach
        if (this.currentGroup.afterEach && test.status != "not-implemented" && test.status != "skipped") {
            try {
                await this.currentGroup.afterEach({ config: this.settings, api: new TestAPI_1.TestAPI(test), context });
            }
            catch (ex) {
                ex.message = "group.afterEach hook: " + ex.message;
                test.console.error(ex);
            }
        }
        if (!test.status) {
            test.status = "succeeded";
        }
        // increment parent count
        // if (test.status != "not-implemented" && test.status != "skipped") {
        //     this.currentGroup.completed++
        // }
        this.emit("testEnd", test);
    }
    async endGroup(node, parent, context, error) {
        // if (parent) parent.completed += node.completed
        if (node.after) {
            try {
                await node.after({ config: this.settings, context });
            }
            catch (ex) {
                ex.message = "group.after hook: " + ex.message;
                console.error(ex);
            }
        }
        this.emit("groupEnd", node);
        if (node.name === "__ROOT__") {
            this.emit("end");
        }
    }
    async run(node, context = {}) {
        if (node instanceof Test_1.Test) {
            // If run is called for a leaf node we don't know its parent so make
            // sure we find it manually and set it as `currentGroup`
            let path = node.path.split(".");
            path.pop();
            // @ts-ignore
            this.currentGroup = globalContext_1.default.root.getNodeAt(path.join("."));
            return await this.runTest(node, context);
        }
        let parentGroup = this.currentGroup;
        this.currentGroup = node;
        if (node.name === "__ROOT__") {
            this.emit("start", { onlyMode: this.onlyMode });
        }
        this.emit("groupStart", node);
        if (node.before) {
            try {
                await node.before({ config: this.settings, context });
            }
            catch (ex) {
                ex.message = "group.before hook: " + ex.message;
                return await this.endGroup(node, parentGroup, context, ex);
            }
        }
        for (const child of node.children) {
            await this.run(child, context);
            if (this.canceled) {
                break;
            }
        }
        await this.endGroup(node, parentGroup, context);
    }
    async runTest(test, context = {}) {
        test.startedAt = Date.now();
        // Exit if onlyMode is being used elsewhere
        if (this.onlyMode && !(test.only || this.currentGroup.only)) {
            // test.console.info('This test was skipped because other tests are using the "only" mode')
            test.status = "skipped";
            return await this.endTest(test, context);
        }
        // Exit if test.minVersion > current version
        if (test.minVersion?.isAbove(this.settings.apiVersion)) {
            test.console.info(`This test was skipped because it requires API version >= ${test.minVersion} (currently using ${this.settings.apiVersion})`);
            test.status = "skipped";
            return await this.endTest(test, context);
        }
        // Exit if test.maxVersion < current version
        if (test.maxVersion?.isBelow(this.settings.apiVersion)) {
            test.console.info(`This test was skipped because it requires API version <= ${test.maxVersion} (currently using ${this.settings.apiVersion})`);
            test.status = "skipped";
            return await this.endTest(test, context);
        }
        // Exit if no match
        if (this.settings.match && !test.name.match(new RegExp(this.settings.match, "i"))) {
            // test.console.info(`This test was skipped because it's name does not match the provided regular expression`)
            test.status = "skipped";
            return await this.endTest(test, context);
        }
        // Exit if test is skipped
        if (test.skip) {
            // test.console.info("This test was skipped because it has a 'skip' option set")
            test.status = "skipped";
            return await this.endTest(test, context);
        }
        // Exit if not implemented
        if (typeof test.fn !== "function") {
            test.status = "not-implemented";
            return await this.endTest(test, context);
        }
        // Invoke group beforeEach
        if (this.currentGroup.beforeEach) {
            try {
                await this.currentGroup.beforeEach({ config: this.settings, api: new TestAPI_1.TestAPI(test), context });
            }
            catch (ex) {
                ex.message = "group.beforeEach hook: " + ex.message;
                return await this.endTest(test, context, ex);
            }
        }
        // execute
        try {
            this.emit("testStart", test);
            await test.fn({ config: this.settings, api: new TestAPI_1.TestAPI(test), context });
            await this.endTest(test, context);
        }
        catch (error) {
            const thrownRe = /\: Expected \[Function\] to not throw an error but got \[/g;
            const match = error.message.match(thrownRe);
            if (match) {
                error.message = error.message
                    .replace(/Error\: /g, "")
                    .replace(thrownRe, `\n✖ `) // 🛈❌
                    .replace(/\]*$/, "");
            }
            await this.endTest(test, context, error);
        }
    }
}
exports.default = TestRunner;
//# sourceMappingURL=TestRunner.js.map