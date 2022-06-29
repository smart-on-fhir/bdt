import { bdt } from "../../types"
import { Test } from "./Test"
import { TestNode } from "./TestNode"




/**
 * Suite is a structural [[TestNode]] that has other [[Suite]] and/or [[Test]]
 * nodes as its children
 */
export class Suite extends TestNode
{
    children: (Suite|Test)[] = []

    before?: bdt.SetupCallbackFn
    beforeEach?: bdt.TestCallbackFn
    after?: bdt.SetupCallbackFn
    afterEach?: bdt.TestCallbackFn

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

    /**
     * Given a path (which is a dot-separated list of indexes), finds and returns
     * the node at that path. For example getPath("2.1.5") will return the sixth
     * child of the second child of the third child of the root node.
     */
    getNodeAt(path = "")
    {
        if (!path) {
            return this;
        }

        return path.split(".").reduce(
            (out, i) => out && out.children ? out.children[+i] : undefined,
            this
        );
    }
}

