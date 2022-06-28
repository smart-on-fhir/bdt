import { HTTPError, Response } from "got"
import { expect } from "@hapi/code"
import {
    setTimeout as timeoutPromise
  } from "timers/promises";


/**
 * Walks thru an object (ar array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @returns Whatever is found in the path or undefined
 */
export function getPath<T=any>(obj: any, path = ""): T
{
    return path.split(".").reduce((out, key) => out ? out[key] : undefined, obj)
}

export function truncate(str: string, maxLength = 5)
{
    if (str.length <= maxLength) {
        return str;
    }
    let middle = Math.floor(maxLength / 2);
    return str.substr(0, middle) + "..." + str.substr(-middle);
}

export function joinSentences(messages: string[]): string
{
    return messages.map(x => x.trim().replace(/[\s\.\:]*$/, "")).filter(Boolean).join(". ") + ".";
}

/**
 * Given an HTTPError object, generates and return detailed message.
 */
export function formatHttpError(error: HTTPError)
{
    let a = `${error.options.method} ${error.request.requestUrl} returned`
    let b = `${error.response.statusCode}`
    let c = getErrorMessageFromResponse(error.response)

    if (error.response.statusMessage) {
        b += ` ${error.response.statusMessage}`;
    }

    error.message = `${a} ${b == c ? b : c}`
    return error;
}

export function getErrorMessageFromResponse(response: Response)
{
    // if (response.statusCode >= 200 || response.statusCode < 300)
    //     return ""

    let msg = `${response.statusCode}`

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
                msg = json.issue.map((i:any) => i.details?.text || i.diagnostics || "Unknown error").join("; ");
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
    } catch (_) {
        // ignore
        // console.error(_)
    }

    return msg;
}

/**
 * Rounds the given number @n using the specified precision.
 * @param n
 * @param [precision]
 */
export function roundToPrecision(n: number|string, precision?: number): number {
    n = parseFloat(n + "");

    if ( isNaN(n) || !isFinite(n) ) {
        return NaN;
    }

    if ( !precision || isNaN(precision) || !isFinite(precision) || precision < 1 ) {
        n = Math.round( n );
    }
    else {
        const q = Math.pow(10, precision);
        n = Math.round( n * q ) / q;
    }

    return n;
}

/**
 * Check if the given @response has the desired status @text
 * @param {request.Response} response The response to check
 * @param {String} text The expected status text
 * @param {String} message Optional custom message
 */
export function expectStatusText(response: Response, text: string, message = "")
{
    expect(
        response.statusMessage,
        `${message || `response.statusMessage must be "${text}"`}. ${getErrorMessageFromResponse(response)}`
    ).to.equal(text);
}

/**
 * Simple utility for waiting. Returns a promise that will resolve after @ms
 * milliseconds.
 */
export function wait(ms: number, signal?: AbortSignal)
{
    return timeoutPromise(ms, `Waited for ${ms} ms`, { signal })
}


interface Scope {
    system  : string
    resource: string
    action  : string
}


export function scopeSet(scopes: string): Scope[]  {
    return scopes.trim().split(/\s+/).map(s => {
        const [system, resource, action] = s.split(/\/|\./)
        return {
            system,
            resource,
            action,
            toString() {
                return `${system}/${resource}.${action}`;
            }
        }
    }) 
}

export function getUnfulfilledScopes(requestedScopeSet: Scope[], grantedScopeSet: Scope[]): Scope[] {
    return requestedScopeSet.filter(requestedScope => {
        return !grantedScopeSet.some(grantedScope => (
            (grantedScope.system   == "*" || grantedScope.system   == requestedScope.system  ) &&
            (grantedScope.resource == "*" || grantedScope.resource == requestedScope.resource) &&
            (grantedScope.action   == "*" || grantedScope.action   == requestedScope.action  )
        ))
    })
}
