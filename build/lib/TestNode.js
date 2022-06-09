"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestNode = void 0;
const Version_1 = require("./Version");
/**
 * This is the base class for Test and Group classes which are nodes in the test
 * tree.
 */
class TestNode {
    constructor(options) {
        /**
         * If true, this node (along with other nodes having `only` set to true)
         * will be executed and nodes without `only` set to true will be skipped
         */
        this.only = false;
        this.skip = false;
        const { minVersion, maxVersion, name, description, path, only, skip } = options;
        this.name = name;
        this.path = path;
        this.only = !!only;
        this.skip = !!skip;
        this.description = description;
        if (minVersion) {
            this._minVersion = new Version_1.Version(minVersion);
        }
        if (maxVersion) {
            const _maxVersion = new Version_1.Version(maxVersion);
            if (this._minVersion && _maxVersion.isBelow(this._minVersion)) {
                throw new Error(`The minimal version "${this._minVersion}" ` +
                    `cannot be lower than the maximal version "${_maxVersion}".`);
            }
            this._maxVersion = _maxVersion;
        }
    }
    get minVersion() {
        return this._minVersion;
    }
    get maxVersion() {
        return this._maxVersion;
    }
    toJSON() {
        const json = {
            name: this.name,
            path: this.path
        };
        if (this.minVersion)
            json.minVersion = this.minVersion.toJSON();
        if (this.maxVersion)
            json.maxVersion = this.maxVersion.toJSON();
        if (this.description)
            json.description = this.description;
        return json;
    }
}
exports.TestNode = TestNode;
//# sourceMappingURL=TestNode.js.map