"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnfulfilledScopes = exports.scopeSet = exports.wait = exports.expectStatusText = exports.roundToPrecision = exports.getErrorMessageFromResponse = exports.formatHttpError = exports.joinSentences = exports.truncate = exports.getPath = void 0;
const code_1 = require("@hapi/code");
const promises_1 = require("timers/promises");
/**
 * Walks thru an object (ar array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @returns Whatever is found in the path or undefined
 */
function getPath(obj, path = "") {
    return path.split(".").reduce((out, key) => out ? out[key] : undefined, obj);
}
exports.getPath = getPath;
function truncate(str, maxLength = 5) {
    if (str.length <= maxLength) {
        return str;
    }
    let middle = Math.floor(maxLength / 2);
    return str.substr(0, middle) + "..." + str.substr(-middle);
}
exports.truncate = truncate;
function joinSentences(messages) {
    return messages.map(x => x.trim().replace(/[\s\.\:]*$/, "")).filter(Boolean).join(". ") + ".";
}
exports.joinSentences = joinSentences;
/**
 * Given an HTTPError object, generates and return detailed message.
 */
function formatHttpError(error) {
    let a = `${error.options.method} ${error.request.requestUrl} returned`;
    let b = `${error.response.statusCode}`;
    let c = getErrorMessageFromResponse(error.response);
    if (error.response.statusMessage) {
        b += ` ${error.response.statusMessage}`;
    }
    error.message = `${a} ${b == c ? b : c}`;
    return error;
}
exports.formatHttpError = formatHttpError;
function getErrorMessageFromResponse(response) {
    // if (response.statusCode >= 200 || response.statusCode < 300)
    //     return ""
    let msg = `${response.statusCode}`;
    if (response.statusMessage) {
        msg += ` ${response.statusMessage}`;
    }
    try {
        const type = response.headers["content-type"] || "text/plain";
        if (type.match(/\bjson\b/i)) {
            let json;
            if (typeof response.body == "string") {
                json = JSON.parse(response.body);
            }
            if (typeof response.body == "object") {
                json = response.body;
            }
            if (json.resourceType === "OperationOutcome") {
                msg = json.issue.map((i) => i.details?.text || i.diagnostics || "Unknown error").join("; ");
            }
            else if (typeof json.error === "string") {
                msg = json.error;
                if (typeof json.error_description === "string") {
                    msg += ". " + json.error_description;
                }
            }
            else {
                msg += " " + truncate(JSON.stringify(json), 500);
            }
        }
        else if (type.match(/^text\/plain/i)) {
            let txt = String(response.body).trim();
            if (txt !== response.statusMessage) {
                msg = truncate(txt, 500);
            }
        }
    }
    catch (_) {
        // ignore
        // console.error(_)
    }
    return msg;
}
exports.getErrorMessageFromResponse = getErrorMessageFromResponse;
/**
 * Rounds the given number @n using the specified precision.
 * @param n
 * @param [precision]
 */
function roundToPrecision(n, precision) {
    n = parseFloat(n + "");
    if (isNaN(n) || !isFinite(n)) {
        return NaN;
    }
    if (!precision || isNaN(precision) || !isFinite(precision) || precision < 1) {
        n = Math.round(n);
    }
    else {
        const q = Math.pow(10, precision);
        n = Math.round(n * q) / q;
    }
    return n;
}
exports.roundToPrecision = roundToPrecision;
/**
 * Check if the given @response has the desired status @text
 * @param {request.Response} response The response to check
 * @param {String} text The expected status text
 * @param {String} message Optional custom message
 */
function expectStatusText(response, text, message = "") {
    code_1.expect(response.statusMessage, `${message || `response.statusMessage must be "${text}"`}. ${getErrorMessageFromResponse(response)}`).to.equal(text);
}
exports.expectStatusText = expectStatusText;
/**
 * Simple utility for waiting. Returns a promise that will resolve after @ms
 * milliseconds.
 */
function wait(ms, signal) {
    return promises_1.setTimeout(ms, `Waited for ${ms} ms`, { signal });
}
exports.wait = wait;
function scopeSet(scopes) {
    return scopes.trim().split(/\s+/).map(s => {
        const [system, resource, action] = s.split(/\/|\./);
        return {
            system,
            resource,
            action,
            toString() {
                return `${system}/${resource}.${action}`;
            }
        };
    });
}
exports.scopeSet = scopeSet;
function getUnfulfilledScopes(requestedScopeSet, grantedScopeSet) {
    return requestedScopeSet.filter(requestedScope => {
        return !grantedScopeSet.some(grantedScope => ((grantedScope.system == "*" || grantedScope.system == requestedScope.system) &&
            (grantedScope.resource == "*" || grantedScope.resource == requestedScope.resource) &&
            (grantedScope.action == "*" || grantedScope.action == requestedScope.action)));
    });
}
exports.getUnfulfilledScopes = getUnfulfilledScopes;
//# sourceMappingURL=lib.js.map