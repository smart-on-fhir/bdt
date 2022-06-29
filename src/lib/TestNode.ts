import { Version } from "./Version"
import { bdt }     from "../../types"


/**
 * This is the base class for Test and Group classes which are nodes in the test
 * tree.
 */
export abstract class TestNode
{
    /**
     * The name of the test. Can only be set once while constructing the
     * instance via the `name` option.
     */
    public readonly name: string;

    /**
     * Each none can have a description
     */
    public readonly description?: string;

    /**
     * The minimal version of the backend API that this test should run against.
     * Can only be set once while constructing the instance via the `minVersion`
     * option.
     */
    protected readonly _minVersion?: Version;
 
    /**
     * The maximal version of the backend API that this test should run against.
     * Can only be set once while constructing the instance via the `maxVersion`
     * option.
     */
    protected readonly _maxVersion?: Version;

    /**
     * The path at which this test is located in the entire test tree. The test
     * itself does not need this to function. It is a metadata assigned to it by
     * the test loader. Can only be set once while constructing the instance via
     * the `path` option.
     */
    readonly path?: string;

    /**
     * If true, this node (along with other nodes having `only` set to true)
     * will be executed and nodes without `only` set to true will be skipped
     */
    readonly only?: boolean = false;

    readonly skip?: boolean = false

    constructor(options: bdt.TestNodeOptions)
    {
        const {
            minVersion, maxVersion, name, description, path, only, skip
        } = options

        this.name = name
        this.path = path
        this.only = !!only
        this.skip = !!skip
        this.description = description

        if (minVersion) {
            this._minVersion = new Version(minVersion)
        }

        if (maxVersion) {
            const _maxVersion = new Version(maxVersion)
    
            if (this._minVersion && _maxVersion.isBelow(this._minVersion)) {
                throw new Error(`The minimal version "${this._minVersion}" ` +
                `cannot be lower than the maximal version "${_maxVersion}".`)
            }
            this._maxVersion = _maxVersion
        }
    }

    public get minVersion()
    {
        return this._minVersion
    }

    public get maxVersion()
    {
        return this._maxVersion
    }

    public toJSON()
    {
        const json: Record<string, any> = {
            name: this.name,
            path: this.path
        }

        if (this.minVersion ) json.minVersion  = this.minVersion.toJSON()
        if (this.maxVersion ) json.maxVersion  = this.maxVersion.toJSON()
        if (this.description) json.description = this.description

        return json
    }
}