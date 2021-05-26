import EventEmitter from "events";
import { Config } from "./bdt";
import { NotSupportedError } from "./errors";
import { Suite } from "./Suite";
import { Test } from "./Test";
import { TestAPI } from "./TestAPI";


export default class TestRunner extends EventEmitter
{
    canceled: boolean = false;

    public settings: Config;

    currentGroup: Suite;

    onlyMode: boolean = false;

    constructor(settings: Config, onlyMode = false)
    {
        super()

        this.canceled = false
        this.onlyMode = onlyMode
        this.settings = settings
    }

    async endTest(test: Test, context: Record<string, any>, error?: Error)
    {
        test.endedAt = Date.now()

        if (error) {

            // Not supported
            if (error instanceof NotSupportedError) {
                test.status = "not-supported"
                test.console.info(error.message)
            }

            // Other errors
            else {
                test.status = "failed"
                test.console.error(error)

                // bail?
                if (this.settings.bail) {
                    this.canceled = true
                }
            }
        }

        // test.after hook attached at runtime?
        if (test.after) {
            try {
                await test.after({ config: this.settings, api: new TestAPI(test), context });
            } catch (ex) {
                ex.message = "test.after hook: " + ex.message
                test.console.error(ex)
            }
        }

        // group.afterEach
        if (this.currentGroup.afterEach && test.status != "not-implemented" && test.status != "skipped") {
            try {
                await this.currentGroup.afterEach({ config: this.settings, api: new TestAPI(test), context });
            } catch (ex) {
                ex.message = "group.afterEach hook: " + ex.message
                test.console.error(ex)
            }
        }

        if (!test.status) {
            test.status = "succeeded"
        }

        // increment parent count
        // if (test.status != "not-implemented" && test.status != "skipped") {
        //     this.currentGroup.completed++
        // }

        this.emit("testEnd", test);
    }

    async endGroup(node: Suite, parent: Suite, context: Record<string, any>, error?: Error)
    {
        // if (parent) parent.completed += node.completed

        if (node.after) {
            try {
                await node.after({ config: this.settings, context });
            } catch (ex) {
                ex.message = "group.after hook: " + ex.message
                console.error(ex)
            }
        }

        this.emit("groupEnd", node);

        if (node.name === "__ROOT__") {
            this.emit("end");
        }
    }

    async run(node: Test | Suite, context: Record<string, any> = {})
    {
        if (node instanceof Test) {
            return await this.runTest(node, context)
        }
        
        let parentGroup = this.currentGroup
        this.currentGroup = node;

        if (node.name === "__ROOT__") {
            this.emit("start", { onlyMode: this.onlyMode });
        }

        this.emit("groupStart", node);

        if (node.before) {
            try {
                await node.before({ config: this.settings, context });
            } catch (ex) {
                ex.message = "group.before hook: " + ex.message
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

    async runTest(test: Test, context: Record<string, any> = {})
    {
        test.startedAt = Date.now()

        // Exit if onlyMode is being used elsewhere
        if (this.onlyMode && !(test.only || this.currentGroup.only)) {
            // test.console.info('This test was skipped because other tests are using the "only" mode')
            test.status = "skipped"
            return await this.endTest(test, context)
        }

        // Exit if test.minVersion > current version
        if (test.minVersion?.isAbove(this.settings.apiVersion)) {
            test.console.info(`This test was skipped because it requires API version >= ${test.minVersion} (currently using ${this.settings.apiVersion})`)
            test.status = "skipped"
            return await this.endTest(test, context)
        }

        // Exit if test.maxVersion < current version
        if (test.maxVersion?.isBelow(this.settings.apiVersion)) {
            test.console.info(`This test was skipped because it requires API version <= ${test.maxVersion} (currently using ${this.settings.apiVersion})`)
            test.status = "skipped"
            return await this.endTest(test, context)
        }

        // Exit if no match
        if (this.settings.match && !test.name.match(new RegExp(this.settings.match, "i"))) {
            test.console.info(`This test was skipped because it's name does not match the provided regular expression`)
            test.status = "skipped"
            return await this.endTest(test, context)
        }

        // Exit if test is skipped
        if (test.skip) {
            test.console.info("This test was skipped because it has a 'skip' option set")
            test.status = "skipped"
            return await this.endTest(test, context)
        }

        // Exit if not implemented
        if (typeof test.fn !== "function") {
            test.status = "not-implemented"
            return await this.endTest(test, context)
        }

        // Invoke group beforeEach
        if (this.currentGroup.beforeEach) {
            try {
                await this.currentGroup.beforeEach({ config: this.settings, api: new TestAPI(test), context })
            } catch (ex) {
                ex.message = "group.beforeEach hook: " + ex.message
                return await this.endTest(test, context, ex);
            }
        }

        // execute
        try {
            this.emit("testStart", test);
            await test.fn({ config: this.settings, api: new TestAPI(test), context })
            await this.endTest(test, context)
        } catch (error) {
            const thrownRe = /\: Expected \[Function\] to not throw an error but got \[/g
            const match = error.message.match(thrownRe)
            if (match) {
                error.message = error.message
                    .replace(/Error\: /g, "")
                    .replace(thrownRe, `\n✖ `)// 🛈❌
                    .replace(/\]*$/, "")
            }
            await this.endTest(test, context, error)
        }
    }
}