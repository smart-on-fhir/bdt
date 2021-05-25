import { NormalizedConfig } from "./Config"
import { Test } from "./Test"
import { TestAPI } from "./TestAPI"
import { TestNode } from "./TestNode"


export type SetupCallbackFn<ContextType=Record<string, any>> = (context: {
    config: NormalizedConfig
    context: ContextType
}) => any

export type TestCallbackFn<ContextType=Record<string, any>> = (context: {
    config: NormalizedConfig
    api: TestAPI
    context: ContextType
}) => any

/**
 * Suite is a structural [[TestNode]] that has other [[Suite]] and/or [[Test]]
 * nodes as its children
 */
export class Suite extends TestNode
{
    children: (Suite|Test)[] = []

    before?: SetupCallbackFn
    beforeEach?: TestCallbackFn
    after?: SetupCallbackFn
    afterEach?: TestCallbackFn

    /**
     * This is a magic method that will be called internally when you
     * `JSON.stringify` the node. It is recursive and will return the
     * entire subtree as JSON
     */
    toJSON()
    {
        const json = super.toJSON()
        json.children = this.children.map(c => c.toJSON())
        return json
    }
}

