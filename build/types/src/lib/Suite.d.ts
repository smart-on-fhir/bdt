import { NormalizedConfig } from "./Config";
import { Test } from "./Test";
import { TestAPI } from "./TestAPI";
import { TestNode } from "./TestNode";
export declare type SetupCallbackFn<ContextType = Record<string, any>> = (context: {
    config: NormalizedConfig;
    context: ContextType;
}) => any;
export declare type TestCallbackFn<ContextType = Record<string, any>> = (context: {
    config: NormalizedConfig;
    api: TestAPI;
    context: ContextType;
}) => any;
/**
 * Suite is a structural [[TestNode]] that has other [[Suite]] and/or [[Test]]
 * nodes as its children
 */
export declare class Suite extends TestNode {
    children: (Suite | Test)[];
    before?: SetupCallbackFn;
    beforeEach?: TestCallbackFn;
    after?: SetupCallbackFn;
    afterEach?: TestCallbackFn;
    /**
     * This is a magic method that will be called internally when you
     * `JSON.stringify` the node. It is recursive and will return the
     * entire subtree as JSON
     */
    toJSON(): Record<string, any>;
}
