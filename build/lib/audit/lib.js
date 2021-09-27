"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merge = exports.urlHasNoPassword = exports.urlHasNoUsername = exports.urlIsHttps = void 0;
function urlIsHttps(url = "") {
    return () => url && url.startsWith("https://");
}
exports.urlIsHttps = urlIsHttps;
function urlHasNoUsername(url = "") {
    return () => {
        if (!url)
            return true;
        const _url = new URL(url);
        return !_url.username;
    };
}
exports.urlHasNoUsername = urlHasNoUsername;
function urlHasNoPassword(url = "") {
    return () => {
        if (!url)
            return true;
        const _url = new URL(url);
        return !_url.username;
    };
}
exports.urlHasNoPassword = urlHasNoPassword;
function merge(...args) {
    let out = {};
    for (const obj of args) {
        for (const key in obj) {
            const val = obj[key];
            if (val && typeof val === "object") {
                out[key] = merge(out[key], val);
            }
            else if (val === undefined) {
                delete out[key];
            }
            else {
                out[key] = val;
            }
        }
    }
    return out;
}
exports.merge = merge;
//# sourceMappingURL=lib.js.map