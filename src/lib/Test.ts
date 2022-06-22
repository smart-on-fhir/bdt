import { Console } from "./Console"
import { TestCallbackFn } from "./Suite";
import { TestNode, TestNodeOptions } from "./TestNode"


export interface TestOptions extends TestNodeOptions {
    id?: string
    fn?: TestCallbackFn
}

export type TestStatus = "succeeded"
                       | "failed"
                       | "not-supported"
                       | "not-implemented"
                       | "skipped"
                       | "aborted"
                       | "warned"
                       | "running"
                       | "unknown";


export class Test extends TestNode
{
    /**
     * The actual function that will be called to execute the test. If omitted
     * the test is considered "not implemented" or "todo". Can only be set once
     * while constructing the instance via the `fn` option.
     */
    readonly fn?: TestCallbackFn

    /**
     * Each test must have unique ID. The test itself does not need this to
     * function properly. It is a metadata assigned to it by the test loader.
     * Can only be set once while constructing the instance via the `id` option.
     * If no `id` is passed, then one will be generated as slug of the path
     */
    readonly id?: string

    // State properties --------------------------------------------------------

    private _status?: TestStatus;

    public endedAt?: number;

    public startedAt?: number;

    public error?: Error;

    public console: Console;

    public after?: TestCallbackFn

    // -------------------------------------------------------------------------

    constructor(options: TestOptions)
    {
        super(options);
        this.id = options.id
        this.fn = options.fn
        this.console = new Console()
    }

    public reset()
    {
        this._status   = undefined
        this.startedAt = undefined
        this.endedAt   = undefined
        this.error     = undefined
        this.console.clear()
    }

    toJSON()
    {
        const json = super.toJSON()
        json.id = this.id
        json.status = this.status
        json.endedAt = this.endedAt
        json.startedAt = this.startedAt
        return json
    }

    public set status(status: TestStatus)
    {
        this._status = status
    }

    public get status()
    {
        return this._status
    }

    end()
    {
        if (!this.endedAt) {
            this.endedAt = Date.now()
        }
    }
}
