import Request, { NormalizedOptions } from "got/dist/source/core";
import { OptionsOfJSONResponseBody, RequestError, Response } from "got";
import { TestAPI } from "./TestAPI";
import { createAuthTokenOptions } from "./auth";
import { NormalizedConfig } from "./Config";
export declare namespace FHIR {
    interface Resource<T = string> extends Record<string, any> {
        resourceType: T;
    }
    interface CapabilityStatement extends Resource<"CapabilityStatement"> {
    }
    interface OperationOutcome extends Resource<"OperationOutcome"> {
    }
}
export declare namespace BulkData {
    /**
     * The response expected upon successful kick-off and status pulling
     */
    interface ExportManifest {
        /**
         * indicates the server's time when the query is run. The response
         * SHOULD NOT include any resources modified after this instant,
         * and SHALL include any matching resources modified up to and
         * including this instant.
         * Note: To properly meet these constraints, a FHIR Server might need
         * to wait for any pending transactions to resolve in its database
         * before starting the export process.
         */
        transactionTime: string;
        /**
         * the full URL of the original bulk data kick-off request
         */
        request: string;
        /**
         * indicates whether downloading the generated files requires a
         * bearer access token.
         * Value SHALL be true if both the file server and the FHIR API server
         * control access using OAuth 2.0 bearer tokens. Value MAY be false for
         * file servers that use access-control schemes other than OAuth 2.0,
         * such as downloads from Amazon S3 bucket URLs or verifiable file
         * servers within an organization's firewall.
         */
        requiresAccessToken: boolean;
        /**
         * an array of file items with one entry for each generated file.
         * If no resources are returned from the kick-off request, the server
         * SHOULD return an empty array.
         */
        output: ExportManifestFile[];
        /**
         * array of error file items following the same structure as the output
         * array.
         * Errors that occurred during the export should only be included here
         * (not in output). If no errors occurred, the server SHOULD return an
         * empty array. Only the OperationOutcome resource type is currently
         * supported, so a server SHALL generate files in the same format as
         * bulk data output files that contain OperationOutcome resources.
         */
        error: ExportManifestFile<"OperationOutcome">[];
        /**
         * An array of deleted file items following the same structure as the
         * output array.
         *
         * When a `_since` timestamp is supplied in the export request, this
         * array SHALL be populated with output files containing FHIR
         * Transaction Bundles that indicate which FHIR resources would have
         * been returned, but have been deleted subsequent to that date. If no
         * resources have been deleted or the _since parameter was not supplied,
         * the server MAY omit this key or MAY return an empty array.
         *
         * Each line in the output file SHALL contain a FHIR Bundle with a type
         * of transaction which SHALL contain one or more entry items that
         * reflect a deleted resource. In each entry, the request.url and
         * request.method elements SHALL be populated. The request.method
         * element SHALL be set to DELETE.
         *
         * Example deleted resource bundle (represents one line in output file):
         * @example
         * ```json
         * {
         *     "resourceType": "Bundle",
         *     "id": "bundle-transaction",
         *     "meta": { "lastUpdated": "2020-04-27T02:56:00Z" },
         *     "type": "transaction",
         *     "entry":[{
         *         "request": { "method": "DELETE", "url": "Patient/123" }
         *         ...
         *     }]
         * }
         * ```
         */
        deleted?: ExportManifestFile<"Bundle">[];
        /**
         * To support extensions, this implementation guide reserves the name
         * extension and will never define a field with that name, allowing
         * server implementations to use it to provide custom behavior and
         * information. For example, a server may choose to provide a custom
         * extension that contains a decryption key for encrypted ndjson files.
         * The value of an extension element SHALL be a pre-coordinated JSON
         * object.
         */
        extension?: Record<string, any>;
    }
    /**
     * Each file or output entry in export manifest
     */
    interface ExportManifestFile<Type = string> {
        /**
         * the FHIR resource type that is contained in the file.
         * Each file SHALL contain resources of only one type, but a server MAY
         * create more than one file for each resource type returned. The number
         * of resources contained in a file MAY vary between servers. If no data
         * are found for a resource, the server SHOULD NOT return an output item
         * for that resource in the response. These rules apply only to top-level
         * resources within the response; as always in FHIR, any resource MAY
         * have a "contained" array that includes referenced resources of other
         * types.
         */
        type: Type;
        /**
         * the path to the file. The format of the file SHOULD reflect that
         * requested in the _outputFormat parameter of the initial kick-off
         * request.
         */
        url: string;
        /**
         * the number of resources in the file, represented as a JSON number.
         */
        count?: number;
    }
    type StatusResponse<T = ExportManifest | FHIR.OperationOutcome | void> = Response<T>;
}
export declare namespace OAuth {
    type errorType = (
    /**
     * The request is missing a required parameter, includes an
     * unsupported parameter value (other than grant type),
     * repeats a parameter, includes multiple credentials,
     * utilizes more than one mechanism for authenticating the
     * client, or is otherwise malformed.
     */
    "invalid_request" | 
    /**
     * Client authentication failed (e.g., unknown client, no
     * client authentication included, or unsupported
     * authentication method).  The authorization server MAY
     * return an HTTP 401 (Unauthorized) status code to indicate
     * which HTTP authentication schemes are supported.  If the
     * client attempted to authenticate via the "Authorization"
     * request header field, the authorization server MUST
     * respond with an HTTP 401 (Unauthorized) status code and
     * include the "WWW-Authenticate" response header field
     * matching the authentication scheme used by the client.
     */
    "invalid_client" | 
    /**
     * The provided authorization grant (e.g., authorization
     * code, resource owner credentials) or refresh token is
     * invalid, expired, revoked, does not match the redirection
     * URI used in the authorization request, or was issued to
     * another client.
     */
    "invalid_grant" | 
    /**
     * The authenticated client is not authorized to use this
     * authorization grant type.
     */
    "unauthorized_client" | 
    /**
     * The authorization grant type is not supported by the
     * authorization server.
     */
    "unsupported_grant_type" | 
    /**
     * The requested scope is invalid, unknown, malformed, or
     * exceeds the scope granted by the resource owner.
     */
    "invalid_scope");
    interface ErrorResponse {
        error: errorType;
        /**
         * OPTIONAL.  Human-readable ASCII [USASCII] text providing
         * additional information, used to assist the client developer in
         * understanding the error that occurred.
         */
        error_description?: string;
        /**
         * OPTIONAL.  A URI identifying a human-readable web page with
         * information about the error, used to provide the client
         * developer with additional information about the error.
         * Values for the "error_uri" parameter MUST conform to the
         */
        error_uri?: string;
    }
    /**
     * Access token response
     */
    interface TokenResponse {
        /**
         * The access token issued by the authorization server.
         */
        access_token: string;
        /**
         * Fixed value: bearer.
         */
        token_type: "bearer";
        /**
         * The lifetime in seconds of the access token. The recommended value
         * is 300, for a five-minute token lifetime.
         */
        expires_in: number;
        /**
         * Scope of access authorized. Note that this can be different from the
         * scopes requested by the app.
         */
        scope: string;
    }
}
export declare type exportType = "system" | "patient" | "group";
export interface requestOptions extends OptionsOfJSONResponseBody {
    skipAuth?: boolean;
    requestLabel?: string;
    responseLabel?: string;
}
export interface requestOptionsWithUrl extends requestOptions {
    url: string | URL;
}
export interface RequestResult<BodyType = unknown> {
    response: Response<BodyType>;
    request: Request;
    options: NormalizedOptions;
    error: RequestError | null;
    body: BodyType;
}
export interface KickOfOptions extends requestOptions {
    params?: {
        _since?: string;
        _outputFormat?: string;
        patient?: (number | string) | (number | string)[];
        _type?: string | string[];
        _elements?: string | string[];
        includeAssociatedData?: string | string[];
        _typeFilter?: string | string[];
    };
    type?: exportType;
    skipAuth?: boolean;
    labelPrefix?: string;
}
/**
 * Implements all the interactions with a bulk-data server that tests may need
 * to use. Helps keeping the tests clean and readable.
 */
export declare class BulkDataClient {
    /**
     * The capability statement
     */
    private _capabilityStatement?;
    /**
     * The access token (if any) is stored here so that different parts of
     * the export flow can use it, instead having to re-authorize before
     * each request
     */
    accessToken: string | null;
    options: NormalizedConfig;
    testApi: TestAPI;
    kickOffRequest?: Request;
    kickOffResponse?: Response;
    statusRequest?: Request;
    statusResponse?: Response<BulkData.ExportManifest>;
    constructor(options: NormalizedConfig, testApi: TestAPI);
    /**
     * Tests can call this method to fetch the CapabilityStatement of the
     * currently tested server
     * @example ```ts
     * const capabilityStatement = await client.getCapabilityStatement()
     * ```
     */
    getCapabilityStatement(): Promise<FHIR.CapabilityStatement>;
    /**
     * This is just a wrapper for [[auth.createAuthToken]], providing some
     * default values from the current settings. Creates and returns signed
     * authentication token
     * @example
     * ```ts
     * const token = client.createAuthenticationToken({
     *     clientId: "...",
     *     expiresIn: "1day"
     * })
     * ```
     */
    createAuthenticationToken(options?: Partial<createAuthTokenOptions>): string;
    /**
     * The purpose of this method is to attach some common properties (like
     * strictSSL and authorization header) to the request options if needed,
     * and then make the the request.
     * @param {Object} options
     * @param {Boolean} skipAuth If true, the authorization header will NOT be
     * included, even if the `requiresAuth` property of the server settings is
     * true.
     * @typeParam BodyType The expected body type. It may be useful to pass custom
     * type definition here, or use some of the existing ones (
     * [[BulkData.ExportManifest]], [[OAuth.TokenResponse]], [[OAuth,ErrorResponse]]
     * [[FHIR.CapabilityStatement]]...)
     */
    request<BodyType = unknown>(options: requestOptionsWithUrl): Promise<RequestResult<BodyType>>;
    authorizeWithCredentials({ requestLabel, responseLabel }: {
        requestLabel?: string;
        responseLabel?: string;
    }): Promise<string>;
    /**
     * Makes an authorization request and logs the request and the response.
     * @param [options]
     * @param [options.scope] Scopes to request (default "system/*.read")
     * @param [options.requestLabel] A label for this request to be rendered in UI. Defaults to "Authorization Request"
     * @param [options.responseLabel] A label for the response to be rendered in UI. Defaults to "Authorization Response"
     */
    authorize(options?: {
        scope?: string;
        requestLabel?: string;
        responseLabel?: string;
    }): Promise<string>;
    /**
     * This is an internal async getter for the access token.
     */
    protected getAccessToken(): Promise<string>;
    /**
     * Starts an export by making a request to the kick-off endpoint. Custom
     * request options can be passed to override the default ones. If any of
     * those option has undefined value it will actually remove that property.
     * For example, ti remove the accept header you can pass
     * `{ headers: { accept: undefined }}`.
     * @param options Custom request options
     * @example
     * ```ts
     *
     * // Start a patient-level export
     * const { response } = await client.kickOff({
     *     type: "patient",
     *     params: {
     *         _type: "Observation"
     *     }
     * })
     *
     * // With more options
     * const { response: response2 } = await client.kickOff({
     *     method: "POST",
     *     type: "group",
     *     headers: {
     *         prefer: "respond-async,handling=lenient"
     *     },
     *     params: {
     *         includeAssociatedData: "LatestProvenanceResources",
     *         _typeFilter: "Patient?status=active",
     *         _since: "2021-05-23T22:51:15-04:00"
     *     },
     *     labelPrefix: "Lenient "
     * });
     *
     * ```
     */
    kickOff(options?: KickOfOptions): Promise<RequestResult<Record<string, any>>>;
    /**
     * Makes a request to the status endpoint and sets `this.statusRequest` and
     * `this.statusResponse`. NOTE that this method expects that the kick-off
     * request has already been made and it will throw otherwise.
     */
    status(): Promise<void>;
    /**
     * Makes multiple requests to the status endpoint until the response code
     * is 202 (or until an error is returned). NOTE that this method expects
     * that the kick-off request has already been made and it will throw
     * otherwise.
     * @todo: Use the retry-after header if available
     */
    waitForExport(suffix?: number): Promise<void>;
    /**
     * Starts an export if not started already and resolves with the response
     * of the completed status request
     */
    getExportResponse(): Promise<Response<BulkData.ExportManifest>>;
    /**
     * Starts an export and waits for it. Then downloads the file at the given
     * index. NOTE: this method assumes that the index exists and will throw
     * otherwise.
     * @param index The (zero-based) index of the file in the status list
     * @param skipAuth If true, the authorization header will NOT be
     * included, even if the `requiresAuth` property of the server settings is
     * true.
     */
    downloadFileAt(index: number, skipAuth?: boolean): Promise<Response<string>>;
    /**
     * Downloads the file at the given fileUrls
     * @param fileUrl The file URL
     * @param options Anything other than `url` (which comes from the first
     * argument) can be passed here to customize the request behavior.
     */
    downloadFile(fileUrl: string, options?: Partial<requestOptions>): Promise<Response<string>>;
    /**
     * Cancels an export by sending a DELETE request to the status endpoint.
     * If an export has not been started does nothing. This will only execute
     * if `kickOffResponse` parameter is a response having a content-location
     * header and a `202` status code
     * @param kickOffResponse The response of successful kick-of request
     * @param [labelPrefix] Prefix message labels in console. Defaults to
     * "Unlabeled", meaning that the request and response will be logged as
     * "Unlabeled Cancellation Request" and "Unlabeled Cancellation Response"
     * @returns A promise resolved with [[RequestResult]] or with `null` if
     * `kickOffResponse` is not a successful kickOf response
     */
    cancelIfStarted(kickOffResponse: Response, labelPrefix?: string): Promise<RequestResult | null>;
    /**
     * Cancels an export by sending a DELETE request to the status endpoint.
     * NOTE that this method expects an export to have been started and will
     * reject with an error otherwise. Use [[cancelIfStarted]] if you are not
     * sure if an export has been started.
     * @param kickOffResponse The response of successful kick-of request
     * @param [labelPrefix] Prefix message labels in console. Defaults to
     * "Unlabeled", meaning that the request and response will be logged as
     * "Unlabeled Cancellation Request" and "Unlabeled Cancellation Response"
     * @see [[expectSuccessfulKickOff]]
     */
    cancel(kickOffResponse: Response, labelPrefix?: string): Promise<RequestResult>;
}
