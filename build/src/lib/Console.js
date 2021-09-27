"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Console = void 0;
/**
 * Each [[Test]] object has an instance of this class attached
 * to it. Tests use that to add entries to the console which
 * ends up being a valuable information for test reporters
 * (as well as for humans)
 */
class Console {
    constructor() {
        /**
         * Private array to store the entries
         */
        this.entries = [];
    }
    /**
     * Add new entry of type "log"
     * @param data One or more items to list
     */
    log(...data) {
        this.add("log", "log", [], ...data);
    }
    /**
     * Add new entry of type "error"
     * @param error The error to add
     */
    error(error) {
        this.add("error", "error", [], error);
    }
    /**
     * Add new entry of type "warn"
     * @param data One or more items to list
     */
    warn(...data) {
        this.add("warn", "warn", [], ...data);
    }
    /**
     * Add new entry of type "info"
     * @param data One or more items to list
     */
    info(...data) {
        this.add("info", "info", [], ...data);
    }
    /**
     * Add new entry of the given type and having a "markdown" tag.
     * The presence of the "markdown" tag can be used by front-ends
     * as a signal that the entry value can be parsed and rendered
     * as markdown.
     * @param markdown The markdown string to add
     * @param type The type of entry
     * @param [label] Give it a custom label
     */
    md(markdown, type, label) {
        this.add(type, label || type, ["markdown"], markdown);
    }
    /**
     * Add new entry of the given type and having a "html" tag.
     * The presence of the "html" tag can be used by front-ends
     * as a signal that the entry value can be parsed and rendered
     * as html.
     * @param html The html string to add
     * @param type The type of entry
     * @param [label] Give it a custom label
     */
    html(html, type, label) {
        this.add(type, label || type, ["html"], html);
    }
    /**
     * Tests can call this to log an http request options object. This can be
     * handled by dedicated request renderers on the frontend.
     * @param req The request options to log
     * @param type The type of entry
     * @param [label] Give it a custom label
     */
    request(req, type = "log", label = "Request") {
        this.add(type, label, ["request"], {
            method: req.method,
            url: req.url.href,
            headers: req.headers,
            payload: req.body || req.form || null
        });
    }
    /**
     * Tests can call this to log an http response object. This will be
     * handled by dedicated response renderer on the frontend.
     * @param res The response to log
     * @param type The type of entry
     * @param label Give it a custom label if you want
     */
    response(res, type = "log", label = "Response") {
        this.add(type, label, ["response"], {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: res.body
        });
    }
    /**
     * Adds new console entry
     */
    add(type, label, tags, ...data) {
        this.entries.push({ type, label, tags, data });
    }
    /**
     * Check if the console has entries of the given type
     */
    has(type) {
        return this.entries.some(e => e.type === type);
    }
    /**
     * Get all entries of the given type
     */
    get(type) {
        return this.entries.filter(e => e.type === type);
    }
    /**
     * Returns a subset of the console entries that match the given argument.
     * If the argument is a string, it should be comma-separated or
     * space-separated list of tags. In this case only entries having all of
     * the listed tags are returned. To get entries having any of the listed
     * tags pass an array instead
     * Example:
     * ```ts
     * console.byTags("a, b") // a AND b
     * console.byTags(["a", "b"]) // a OR b
     * ```
     */
    byTags(tags) {
        if (typeof tags === "string") {
            const allTags = tags.trim().split(/\s+|\s*,\s*/);
            return this.entries.filter(e => allTags.every(t => e.tags.indexOf(t) >= 0));
        }
        return this.entries.filter(e => tags.some(t => e.tags.indexOf(t) >= 0));
    }
    /**
     * Iterate over entries.
     * Note, that you can use other methods to filter:
     * ```ts
     * console.get("error").forEach(entry => { ... })
     * // or
     * console.byTags("request").forEach(entry => { ... })
     * ```
     */
    forEach(callback) {
        this.entries.forEach(callback);
    }
}
exports.Console = Console;
//# sourceMappingURL=Console.js.map