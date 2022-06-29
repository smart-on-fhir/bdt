import EventEmitter          from "events"
import { NotSupportedError } from "./errors"
import { Suite }             from "./Suite"
import { Test }              from "./Test"
import { TestAPI }           from "./TestAPI"
import { bdt }               from "../../types"


export default class TestRunner extends EventEmitter
{
    canceled: boolean = false;

    public settings: bdt.BDTOptions;

    currentGroup: Suite;

    currentTestApi: TestAPI;

    onlyMode: boolean = false;

    context: Record<string, any>

    startPath: string | null = null

    constructor(settings: bdt.BDTOptions, onlyMode = false, context = {})
    {
        super()

        this.canceled = false
        this.onlyMode = onlyMode
        this.settings = settings
        this.context  = context
    }

    async endTest(test: Test, context: Record<string, any>, error?: Error)
    {
        test.endedAt = Date.now()

        if (error) {

            // Not supported
            if (error instanceof NotSupportedError) {
                test.status = "not-supported"
                test.console.info(String(error))
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

        if (test.path === this.startPath) {
            this.emit("end");
            this.startPath = null
        }
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

        if (node.path === this.startPath) {
            this.emit("end");
            this.startPath = null
        }
    }

    async run(node: Test | Suite, context: Record<string, any> = {}) {
        this.startPath = node.path
        this.emit("start", { onlyMode: this.onlyMode });
        return this._run(node, context)
    }

    async _run(node: Test | Suite, context: Record<string, any> = {})
    {
        if (node instanceof Test) {
            
            // If run is called for a leaf node we don't know its parent so make
            // sure we find it manually and set it as `currentGroup`
            let path = node.path.split(".");
            path.pop();
            // @ts-ignore
            this.currentGroup = this.context.root.getNodeAt(path.join(".")) as Suite;
            return await this.runTest(node, context)
        }
        
        let parentGroup = this.currentGroup
        this.currentGroup = node;

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
            await this._run(child, context);
            if (this.canceled) {
                break;
            }
        }

        await this.endGroup(node, parentGroup, context);
    }

    async runTest(test: Test, context: Record<string, any> = {})
    {
        test.reset()
        
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
            // test.console.info(`This test was skipped because it's name does not match the provided regular expression`)
            test.status = "skipped"
            return await this.endTest(test, context)
        }

        // Exit if test is skipped
        if (test.skip) {
            // test.console.info("This test was skipped because it has a 'skip' option set")
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
            this.currentTestApi = new TestAPI(test)
            await test.fn({ config: this.settings, api: this.currentTestApi, context })
            await this.endTest(test, context)
        } catch (error) {
            if (error instanceof NotSupportedError) {
                test.status = "not-supported"
                this.currentTestApi.setNotSupported(error.message)
                await this.endTest(test, context)
            }
            else if (error.name === "AbortError" || error.name === "CancelError") {
                test.status = "aborted"
                this.currentTestApi.console.warn("Test aborted")
                await this.endTest(test, context)
            }
            else {
                const thrownRe = /\: Expected \[Function\] to not throw an error but got \[/g
                const match = error.message.match(thrownRe)
                if (match) {
                    error.message = error.message
                        .replace(/Error\: /g, "")
                        .replace(thrownRe, `\n✖ `)// ❌
                        .replace(/\]*$/, "")
                }
                await this.endTest(test, context, error)
            }
        } finally {
            this.currentTestApi = null
        }
    }

    abort(aportAll = false) {
        if (aportAll) {
            this.canceled = true
        }

        this.currentTestApi && this.currentTestApi.abortController.abort()
    }
}