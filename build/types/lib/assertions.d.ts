import { Response } from "got/dist/source";
import { TestAPI } from "./TestAPI";
import { OAuth } from "./BulkDataClient";
export declare function concat(...messages: (string | Error)[]): string;
/**
 * Asserts that the `statusCode` of the given response is either:
 * 1. Equal to the given `code` argument, if that code is a number
 * 2. Listed in the given `code` argument, if that code is an array of numbers
 * @category Response Assertion
 */
export declare function expectResponseCode(response: Response, code: number | number[], prefix?: string): void;
/**
 * Asserts that the `statusMessage` of the given response is either:
 * 1. Equal to the given `text` argument, if that text is a string
 * 2. Listed in the given `text` argument, if that text is an array of strings
 * @category Response Assertion
 */
export declare function expectResponseText(response: Response, text: string | string[], prefix?: string): void;
/**
 * Asserts that the `statusCode` of the given response is either
 * between `400` and `499`
 * @category Response Assertion
 */
export declare function expectClientError(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectJsonResponse(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectNDJsonResponse(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectFhirResource(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectFhirResourceType(response: Response, resourceType: string, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectOperationOutcome(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectUnauthorized(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectOAuthError(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectOAuthErrorType(response: Response, type: OAuth.errorType, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectSuccessfulAuth(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectFailedKickOff(response: Response, testApi: TestAPI, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectSuccessfulKickOff(response: Response, testApi: TestAPI, prefix?: string): string | void;
/**
 * @category Response Assertion
 */
export declare function expectSuccessfulExport(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectSuccessfulDownload(response: Response, prefix?: string): void;
/**
 * @category Response Assertion
 */
export declare function expectExportNotEmpty(response: Response, prefix?: string): void;
export declare function expectNDJSONElements(body: string, elements: string[], prefix?: string): void;
