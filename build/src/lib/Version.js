"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = void 0;
class Version {
    constructor(input) {
        if (input instanceof Version) {
            return input.clone();
        }
        const segments = String(input).trim().split(/\s*\.\s*/).map(x => parseInt(x, 10));
        segments.forEach(x => {
            if (isNaN(x) || !isFinite(x) || x < 0) {
                throw new TypeError(`Invalid version "${input}"`);
            }
        });
        this._segments = segments;
    }
    clone() {
        return new Version(this.toString());
    }
    toString() {
        return this._segments.join(".");
    }
    toJSON() {
        return this.toString();
    }
    get segments() {
        return [...this._segments];
    }
    isBelow(version) {
        return this.compare(version) < 0;
    }
    isBelowOrEqualTo(version) {
        return this.compare(version) <= 0;
    }
    isAbove(version) {
        return this.compare(version) > 0;
    }
    isAboveOrEqualTo(version) {
        return this.compare(version) >= 0;
    }
    isEqualTo(version) {
        return this.compare(version) === 0;
    }
    /**
     * Compares this version with another one and returns:
     * - `1` if this version is higher
     * - `0` if versions are equal
     * - `-1` if this version is lower
     */
    compare(version) {
        if (typeof version === "string") {
            version = new Version(version);
        }
        let a = this.segments;
        let b = version.segments;
        for (let i = 0; i < a.length && i < b.length; i++) {
            if (a[i] > b[i]) {
                return 1;
            }
            if (a[i] < b[i]) {
                return -1;
            }
        }
        return 0;
    }
}
exports.Version = Version;
//# sourceMappingURL=Version.js.map