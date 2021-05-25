import { Version } from "./Version";
export interface TestNodeOptions {
    name: string;
    description?: string;
    minVersion?: string;
    maxVersion?: string;
    path?: string;
    only?: boolean;
    skip?: boolean;
}
/**
 * This is the base class for Test and Group classes which are nodes in the test
 * tree.
 */
export declare abstract class TestNode {
    /**
     * The name of the test. Can only be set once while constructing the
     * instance via the `name` option.
     */
    readonly name: string;
    /**
     * Each none can have a description
     */
    readonly description?: string;
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
    readonly only?: boolean;
    readonly skip?: boolean;
    constructor(options: TestNodeOptions);
    get minVersion(): Version;
    get maxVersion(): Version;
    toJSON(): Record<string, any>;
}
