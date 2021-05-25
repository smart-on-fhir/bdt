"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test = void 0;
const Console_1 = require("./Console");
const TestNode_1 = require("./TestNode");
class Test extends TestNode_1.TestNode {
    // -------------------------------------------------------------------------
    constructor(options) {
        super(options);
        this.id = options.id;
        this.fn = options.fn;
        this.console = new Console_1.Console();
    }
    toJSON() {
        const json = super.toJSON();
        json.id = this.id;
        json.status = this.status;
        json.endedAt = this.endedAt;
        json.startedAt = this.startedAt;
        return json;
    }
    set status(status) {
        this._status = status;
    }
    get status() {
        return this._status;
    }
    end() {
        if (!this.endedAt) {
            this.endedAt = Date.now();
        }
    }
}
exports.Test = Test;
//# sourceMappingURL=Test.js.map