import { HTTPError, Response } from "got";
/**
 * Walks thru an object (ar array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @returns Whatever is found in the path or undefined
 */
export declare function getPath<T = any>(obj: any, path?: string): T;
export declare function truncate(str: string, maxLength?: number): string;
export declare function joinSentences(messages: string[]): string;
/**
 * Given an HTTPError object, generates and return detailed message.
 */
export declare function formatHttpError(error: HTTPError): HTTPError;
export declare function getErrorMessageFromResponse(response: Response): string;
/**
 * Rounds the given number @n using the specified precision.
 * @param n
 * @param [precision]
 */
export declare function roundToPrecision(n: number | string, precision?: number): number;
/**
 * Check if the given @response has the desired status @text
 * @param {request.Response} response The response to check
 * @param {String} text The expected status text
 * @param {String} message Optional custom message
 */
export declare function expectStatusText(response: Response, text: string, message?: string): void;
/**
 * Simple utility for waiting. Returns a promise that will resolve after @ms
 * milliseconds.
 */
export declare function wait(ms: number, signal?: AbortSignal): Promise<string>;
interface Scope {
    system: string;
    resource: string;
    action: string;
}
export declare function scopeSet(scopes: string): Scope[];
export declare function getUnfulfilledScopes(requestedScopeSet: Scope[], grantedScopeSet: Scope[]): Scope[];
export {};
