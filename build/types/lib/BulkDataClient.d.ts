import Request, { NormalizedOptions } from "got/dist/source/core";
import { OptionsOfUnknownResponseBody, RequestError, Response } from "got";
import { TestAPI } from "./TestAPI";
import { bdt } from "../../types";
export declare type exportType = "system" | "patient" | "group";
export interface requestOptions extends OptionsOfUnknownResponseBody {
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
    options: bdt.NormalizedConfig;
    testApi: TestAPI;
    kickOffRequest?: Request;
    kickOffResponse?: Response;
    statusRequest?: Request;
    statusResponse?: Response<bdt.BulkData.ExportManifest>;
    constructor(options: bdt.NormalizedConfig, testApi: TestAPI);
    /**
     * Tests can call this method to fetch the CapabilityStatement of the
     * currently tested server
     * @example ```ts
     * const capabilityStatement = await client.getCapabilityStatement()
     * ```
     */
    getCapabilityStatement(): Promise<bdt.FHIR.CapabilityStatement>;
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
    createAuthenticationToken(options?: Partial<bdt.createAuthTokenOptions>): string;
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
     *         prefer: "respond-async, handling=lenient"
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
     */
    getExportManifest(res: Response, suffix?: number): Promise<bdt.BulkData.ExportManifest>;
    /**
     * Starts an export if not started already and resolves with the response
     * of the completed status request
     */
    getExportResponse(): Promise<Response<bdt.BulkData.ExportManifest>>;
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
