"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Suite = void 0;
const TestNode_1 = require("./TestNode");
/**
 * Suite is a structural [[TestNode]] that has other [[Suite]] and/or [[Test]]
 * nodes as its children
 */
class Suite extends TestNode_1.TestNode {
    constructor() {
        super(...arguments);
        this.children = [];
    }
    /**
     * This is a magic method that will be called internally when you
     * `JSON.stringify` the node. It is recursive and will return the
     * entire subtree as JSON
     */
    toJSON() {
        const json = super.toJSON();
        json.children = this.children.map(c => c.toJSON());
        return json;
    }
}
exports.Suite = Suite;
//# sourceMappingURL=Suite.js.map