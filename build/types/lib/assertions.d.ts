import { Response } from "got/dist/source";
import { TestAPI } from "./TestAPI";
import { OAuth, BulkData, FHIR } from "./BulkDataClient";
import moment from "moment";
export declare const HTTP_DATE_FORMATS: (string | moment.MomentBuiltinFormat)[];
export interface AssertAPI {
    bulkData: BulkDataAssertion;
    response: ResponseAssertions;
}
export interface BulkDataAssertion {
    auth: {
        OK: (response: Response, prefix?: string) => void;
        notOK: (response: Response, prefix?: string) => void;
    };
    cancellation: {
        OK: (res: Response<unknown>, prefix?: string) => void;
        notOK: (res: Response<unknown>, prefix?: string) => void;
    };
    download: {
        OK: (response: Response, prefix?: string) => void;
        notOK: (res: Response<unknown>, prefix?: string) => void;
        withElements: (body: string, elements: string[], prefix?: string) => void;
    };
    kickOff: {
        OK: (response: Response, testApi: TestAPI, prefix?: string) => string | void;
        notOK: (response: Response, testApi: TestAPI, prefix?: string) => void;
    };
    /**
     * A set of assertions to verify the proper structure of the export manifest
     */
    manifest: ManifestAssertions;
    /**
     * A set of assertions to be executed against the status endpoint's response
     */
    status: StatusResponseAssertions;
}
/**
 * A set of assertions to be executed against the status endpoint's response
 */
export interface StatusResponseAssertions {
    /**
     * Asserts that the status endpoint replies with 200 OK and a JSON body
     * that is a valid export manifest and that the `expires` header is valid
     * if present.
     * @tutorial https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---complete-status
     * @example
     * ```ts
     * assert.bulkData.status.OK(response, "Status response is invalid")
     * ```
     */
    OK(response: BulkData.StatusResponse<BulkData.ExportManifest>, prefix?: string): void;
    /**
     * Asserts that the status endpoint reply is valid, but also produces
     * non-empty `output` array.
     * @example
     * ```ts
     * assert.bulkData.status.notEmpty(response, "No files exported")
     * ```
     */
    notEmpty(response: BulkData.StatusResponse<BulkData.ExportManifest>, prefix?: string): void;
    /**
     * @tutorial https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---error-status-1
     * @example
     * ```ts
     * assert.bulkData.status.notOK(response, "The status endpoint was expected to fail")
     * ```
     */
    notOK(res: BulkData.StatusResponse<FHIR.OperationOutcome>, prefix?: string): void;
    /**
     * Asserts that:
     * - The status endpoint replies with `202 Accepted`.
     * - No `content-location` header is present
     * - If set, the `x-progress` header is less than than 100 characters long
     * - If set, the `retry-after` header is valid HTTP Date in the future, or
     *   a positive decimal integer
     *
     * > Optionally, the server MAY return an `X-Progress` header with a text
     *   description of the status of the request that’s less than 100 characters.
     *   The format of this description is at the server’s discretion and may be a
     *   percentage complete value, or a more general status such as “in progress”.
     *   The client MAY parse the description, display it to the user, or log it.
     *
     * **NOTE:** This will only work properly if called after successful kick-off
     * and before the export is complete!
     * @tutorial https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---in-progress-status
     * @example
     * ```ts
     * assert.bulkData.status.pending(response, "The status must be pending")
     * ```
     */
    pending(res: BulkData.StatusResponse<any>, prefix?: string): void;
}
/**
 * A set of assertions to verify the proper structure of the export manifest
 */
export interface ManifestAssertions {
    OK(res: Response<BulkData.ExportManifest>, prefix?: string): void;
    body: ManifestBodyAssertions;
    deleted: ManifestDeletedAssertions;
    error: ManifestErrorAssertions;
    output: ManifestOutputAssertions;
}
/**
 * Assertions for the body of the export manifest
 */
export interface ManifestBodyAssertions {
    OK(manifest: BulkData.ExportManifest, kickOffUrl: string, prefix?: string): void;
}
export interface ManifestDeletedAssertions {
    OK(items: BulkData.ExportManifestFile<"Bundle">[], prefix?: string): void;
}
export interface ManifestErrorAssertions {
    OK(items: BulkData.ExportManifestFile<"OperationOutcome">[], prefix?: string): void;
}
/**
 * Assertions for the body of the export manifest
 */
export interface ManifestOutputAssertions {
    OK(items: BulkData.ExportManifestFile<string>[], type: string, prefix?: string): void;
}
export interface ResponseAssertions {
    OperationOutcome(response: Response, prefix?: string): void;
    clientError(response: Response, prefix?: string): void;
    fhirResource(response: Response, prefix?: string): void;
    fhirResourceType(response: Response, resourceType: string, prefix?: string): void;
    json(response: Response, prefix?: string): void;
    ndJson(response: Response, prefix?: string): void;
    oauthError(response: Response, prefix?: string): void;
    oauthErrorType(response: Response, type: OAuth.errorType, prefix?: string): void;
    statusCode(response: Response, code: number | number[], prefix?: string): void;
    statusText(response: Response, text: string | string[], prefix?: string): void;
}
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
export declare function expectHttpDate(date: string, prefix?: string): void;
export declare function expectHttpDateAfter(date: string, after?: string | null, prefix?: string): void;
export declare function expectHttpDateBefore(date: string, before?: string | null, prefix?: string): void;
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
/**
 *
 * @param item
 * @param type
 * @param prefix
 * @internal
 */
export declare function expectValidManifestEntry(item: BulkData.ExportManifestFile, type: string, prefix?: string): void;
export declare const assert: AssertAPI;
