import moment from "moment";
import Request, { NormalizedOptions } from "got/dist/source/core"
import got, { HTTPError, OptionsOfUnknownResponseBody, RequestError, Response } from "got"
import { NotSupportedError } from "./errors"
import { formatHttpError, getErrorMessageFromResponse, wait } from "./lib";
import { TestAPI } from "./TestAPI"
import { expectSuccessfulKickOff, HTTP_DATE_FORMATS } from "./assertions"
import { createAuthToken } from "./auth"
// @ts-ignore
import pkg from "../../package.json"
import { bdt } from "../../types";
import { promisify } from "util"
import { unzip } from "zlib"






export type exportType = "system" | "patient" | "group"

export interface requestOptions extends OptionsOfUnknownResponseBody {
    skipAuth?: boolean
    requestLabel?: string
    responseLabel?: string
}

export interface requestOptionsWithUrl extends requestOptions {
    url: string | URL
}

export interface RequestResult<BodyType = unknown> {
    response: Response<BodyType>
    request : Request
    options : NormalizedOptions
    error   : RequestError | null
    body    : BodyType
}

export interface KickOfOptions extends requestOptions {
    params?: {
        _since?: string
        _outputFormat?: string
        patient              ?: (number|string) | (number|string)[]
        _type                ?: string | string[]
        _elements            ?: string | string[]
        includeAssociatedData?: string | string[]
        _typeFilter          ?: string | string[]
    }
    type?: exportType
    skipAuth?: boolean,
    labelPrefix?: string
    // method?: "GET"|"POST"
    // [key: string]: any 
}

/**
 * Implements all the interactions with a bulk-data server that tests may need
 * to use. Helps keeping the tests clean and readable.
 */
export class BulkDataClient
{
    /**
     * The capability statement
     */
    private _capabilityStatement?: bdt.FHIR.CapabilityStatement;

    /**
     * The access token (if any) is stored here so that different parts of
     * the export flow can use it, instead having to re-authorize before
     * each request
     */
    accessToken: string | null = null;

    options: bdt.NormalizedConfig;
    
    testApi: TestAPI;
    
    kickOffRequest?: Request;
    kickOffResponse?: Response;
    statusRequest?: Request;
    statusResponse?: Response<bdt.BulkData.ExportManifest>

    constructor(options: bdt.NormalizedConfig, testApi: TestAPI)
    {
        this.options = options;
        this.testApi = testApi;
    }
 
    /**
     * Tests can call this method to fetch the CapabilityStatement of the
     * currently tested server
     * @example ```ts
     * const capabilityStatement = await client.getCapabilityStatement()
     * ```
     */
    async getCapabilityStatement()
    {
        if (this._capabilityStatement === undefined) {
            const { body, error } = await this.request<bdt.FHIR.CapabilityStatement>({
                requestLabel: "CapabilityStatement Request",
                responseLabel: "CapabilityStatement Response",
                url: 'metadata?_format=json',
                skipAuth: true,
                responseType: "json",
                headers: {
                    accept: "application/fhir+json,application/json+fhir,application/json"
                }
            });

            if (error || !body) {
                this._capabilityStatement = null
            } else {
                this._capabilityStatement = body
            }
        }

        if (!this._capabilityStatement) {
            throw new Error(`No capability statement found at "${this.options.baseURL}/metadata"`)
        }

        return this._capabilityStatement;
    }

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
    createAuthenticationToken(options: Partial<bdt.createAuthTokenOptions> = {}): string {
        return createAuthToken({
            tokenEndpoint: this.options.authentication.tokenEndpoint,
            clientId     : this.options.authentication.clientId,
            privateKey   : this.options.authentication.privateKey,
            expiresIn    : this.options.authentication.tokenExpiresIn,
            jwksUrl      : this.options.authentication.jwksUrl,
            algorithm    : (
                this.options.authentication.privateKey?.alg ||
                this.options.authentication.tokenSignAlgorithm
            ) as bdt.SupportedJWKAlgorithm,
            ...options,
            header: {
                ...this.options.authentication.customTokenHeaders,
                ...options.header
            },
            claims: {
                ...this.options.authentication.customTokenClaims,
                ...options.claims
            }
        })
    }
 
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
    async request<BodyType=unknown>(options: requestOptionsWithUrl): Promise<RequestResult<BodyType>>
    {
        const {
            requestLabel = "Request",
            responseLabel = "Response",
            skipAuth,
            ...gotOptions
        } = options


        let requestError: RequestError;
        
        let requestOptions: OptionsOfUnknownResponseBody = {
            isStream: false,
            resolveBodyOnly: false,
            responseType: "text",
            timeout: this.options.requests.timeout,
            decompress: false,
            retry: {
                limit: 0
            },
            // responseType: "json",
            throwHttpErrors: false,
            // prefixUrl: this.options.baseURL,
            
            https: {
                rejectUnauthorized: this.options.requests.strictSSL
            },
            ...gotOptions,
            headers: {
                'user-agent': `BDT / ${pkg.version}`,
                ...this.options.requests.customHeaders,
                ...gotOptions.headers,
            },
            hooks: {
                beforeRequest: [
                    (options) => {
                        this.testApi.console.request(options, "log", requestLabel);
                    }
                ],
                afterResponse: [
                    async (response) => {
                        if (response.headers["content-encoding"]?.match(/\bgzip\b/)) {
                            response.body = (await promisify(unzip)(response.rawBody)).toString("utf8")
                        }
                        this.testApi.console.response(response, "log", responseLabel);
                        return response                
                    }
                ],
                beforeError: [
                    error => {
                        requestError = error
                        if (error.response && error.request) {
                            requestError = formatHttpError(error as HTTPError)
                        }
                        return requestError
                    }
                ],

            }
        };

        if (typeof requestOptions.url === "string" && !requestOptions.url.startsWith("http")) {
            requestOptions.prefixUrl = this.options.baseURL
            requestOptions.url = requestOptions.url.replace(/^\s*\/+/, "")
        }

        if (this.options.authentication.type !== "none" &&
            // !this.options.authentication.optional &&
            !requestOptions.headers.authorization &&
            !skipAuth &&
            this.options.authentication.tokenEndpoint &&
            requestOptions.url !== this.options.authentication.tokenEndpoint
        ) {
            const accessToken = await this.getAccessToken();
            requestOptions.headers = {
                ...requestOptions.headers,
                authorization: "Bearer " + accessToken
            };
        }

        // requestOptions.responseType = requestOptions.headers.accept ? "json" : "text"

        // if (requestOptions.method == "POST")
        //     console.log(requestOptions)
        // console.log(requestOptions.url.toString(), requestOptions)

        const result = await (async () => {
            let job = got(requestOptions);
            
            const abort = () => job.cancel("Test(s) canceled");
            this.testApi.abortController.signal.addEventListener("abort", abort);
            
            return job.finally(
                () => this.testApi.abortController.signal.removeEventListener("abort", abort)
            );
        })()

        if (result.statusCode === 401 && requestOptions.headers.authorization && !options.context?.retried) {
            this.accessToken = null
            return this.request<BodyType>({ ...options, context: { ...options.context, retried: true }})
        }

        // console.log(result.request.requestUrl, result.request.options.headers)

        if (typeof result.body === "string" && result.headers["content-type"]?.match(/^application\/(json|fhir+json|json+fhir)/)) {
            result.body = JSON.parse(result.body)
        }

        return {
            response: <unknown>result as Response<BodyType>,
            request : result.request,
            options : result.request.options,
            error   : requestError || null,
            body    : <unknown>result.body as BodyType
        }
    }
 
    async authorizeWithCredentials({ requestLabel = "Authorization Request", responseLabel = "Authorization Response" }: {
        requestLabel?: string
        responseLabel?: string
    })
    {
        const {
            authentication: {
                clientId,
                clientSecret,
                tokenEndpoint
            }
        } = this.options

        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const { body } = await this.request<bdt.OAuth.TokenResponse>({
            url   : tokenEndpoint,
            method: "POST",
            requestLabel,
            responseLabel,
            responseType: "json",
            headers: {
                authorization: `Basic ${authHeader}`
            }
        });

        if (!body.access_token) {
            throw new Error(`Unable to authorize.`);
        }

        return body.access_token;
    }
 
    /**
     * Makes an authorization request and logs the request and the response.
     * @param [options]
     * @param [options.scope] Scopes to request (default "system/*.read")
     * @param [options.requestLabel] A label for this request to be rendered in UI. Defaults to "Authorization Request"
     * @param [options.responseLabel] A label for the response to be rendered in UI. Defaults to "Authorization Response"
     */
    async authorize(options: {
        scope?: string,
        requestLabel?: string,
        responseLabel?: string
    } = {}): Promise<string> {
        const {
            scope,
            requestLabel = "Authorization Request",
            responseLabel = "Authorization Response"
        } = options;
        const {
            type,
            clientSecret,
            tokenEndpoint,
            scope: configuredScope,
        } = this.options.authentication

        if (type === "none") {
            throw new Error('Unable to authorize! This server does not support authentication (according to the "authType" option).');
        }

        if (type === "client-credentials") {
            if (!clientSecret) {
                throw new Error('Unable to authorize! A "clientSecret" option is needed for client-credentials authentication.');
            }
            return await this.authorizeWithCredentials({ requestLabel, responseLabel });
        }

        const authToken = this.createAuthenticationToken()

        const { body, response } = await this.request<bdt.OAuth.TokenResponse>({
            url: tokenEndpoint,
            requestLabel,
            responseLabel,
            responseType: "json",
            method: "POST",
            prefixUrl: undefined,
            form: {
                scope                : scope || configuredScope,
                grant_type           : "client_credentials",
                client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                client_assertion     : authToken
            }
        });

        if (response.statusCode === 404) {
            this.testApi.console.md(
                'Please make sure you are using valid `tokenEndpoint` configuration option (currently `' + tokenEndpoint + '`)',
                "info",
                "Suggestion"
            )
        }

        if (!body.access_token) {
            throw new Error("Unable to authorize. No access token returned.");
        }

        return body.access_token;
    }
 
    /**
     * This is an internal async getter for the access token.
     */
    protected async getAccessToken()
    {
        if (!this.accessToken) {
            this.accessToken = await this.authorize();
        }
        return this.accessToken;
    }
 
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
    async kickOff(options: KickOfOptions = {})
    {
        const { params, type, skipAuth, labelPrefix = "", ...rest } = options;
        const { systemExportEndpoint, patientExportEndpoint, groupExportEndpoint, baseURL } = this.options
 
        let path;
        if (type === "system") {
            path = systemExportEndpoint;
            if (!path) {
                throw new NotSupportedError("System-level export is not supported by this server");
            }
        } else if (type === "patient") {
            path = patientExportEndpoint;
            if (!path) {
                throw new NotSupportedError("Patient-level export is not supported by this server");
            }
        } else if (type === "group") {
            path = groupExportEndpoint;
            if (!path) {
                throw new NotSupportedError("Group-level export is not supported by this server");
            }
        } else {
            path = (systemExportEndpoint || patientExportEndpoint || groupExportEndpoint);
            if (!path) {
                throw new NotSupportedError("No export endpoints defined in configuration");
            }
        }
 
        const url = new URL(path, baseURL.replace(/\/*$/, "/"));

        if (rest.method === "POST") {
            rest.json = rest.json || {
                resourceType: "Parameters",
                parameter: []
            };
        }
        
        if (params && typeof params == "object") {
            if (rest.method === "POST") {
                function asArray(x: any): any[] {
                    return Array.isArray(x) ? x : [x]
                }

                // rest.json = true
                for (const key in params) {
                    switch (key) {
                        
                        // _since is single valueInstant parameter
                        case "_since":
                            rest.json.parameter.push({
                                name: key,
                                valueInstant: params[key]
                            });
                        break;

                        // _outputFormat is single valueString parameter
                        case "_outputFormat":
                            rest.json.parameter.push({
                                name: key,
                                valueString: params[key]
                            });
                        break;

                        // patient is sent as one or more valueReference params
                        case "patient":
                            rest.json.parameter = rest.json.parameter.concat(
                                asArray(params[key]).map((id: any) => ({
                                    name : "patient",
                                    valueReference : { reference: `Patient/${id}` }
                                }))
                            );
                        break;

                        // _type is sent as one or more valueString params
                        case "_type":
                            rest.json.parameter = rest.json.parameter.concat(
                                asArray(params[key]).map((type: any) => ({
                                    name: "_type",
                                    valueString: type
                                }))
                            );
                        break;
                        
                        // _elements, _typeFilter and includeAssociatedData are sent
                        // as one or more valueString params
                        case "_elements":
                        case "includeAssociatedData":
                        case "_typeFilter":
                            rest.json.parameter = rest.json.parameter.concat(
                                asArray(params[key]).map((type: any) => ({
                                    name: key,
                                    valueString: type
                                }))
                            );
                            // rest.json.parameter.push({
                            //     name: key,
                            //     valueString: asArray(params[key]).join(",")
                            // });
                        break;

                        // Reject unknown params
                        default:
                            throw new Error(`Unknown parameter ${key}`);
                    }
                }
            } else {
                for (const key in params) {
                    const param = params[key as keyof KickOfOptions["params"]]
                    if (Array.isArray(param)) {
                        param.forEach((val: any) => {
                            url.searchParams.append(key, val);
                        });
                    } else {
                        url.searchParams.append(key, param + "");
                    }
                }
            }
        }

        const requestOptions: requestOptionsWithUrl = {
            url,
            ...rest,
            responseType : "json",
            requestLabel : labelPrefix + "Kick-off Request",
            responseLabel: labelPrefix + "Kick-off Response",
            skipAuth,
            followRedirect: false,
            maxRedirects: 0,
            // throwHttpErrors: true,
            headers: {
                accept: "application/fhir+json",
                prefer: "respond-async",
                ...rest.headers
            }
        };

        const result = await this.request<Record<string, any>>(requestOptions) 

        // console.log(result.request.requestUrl, result.request.options.headers, result.response.statusCode, result.body)

        this.kickOffRequest  = result.request
        this.kickOffResponse = result.response

        // console.log(result)
        if (result.error) {
            if (result.response.statusCode === 401 && !skipAuth) {
                const { optional, clientId, type, privateKey, clientSecret } = this.options.authentication
                const suggest = (msg: string) => this.testApi.console.md(msg, "info", "Suggestion")
                
                if (optional) {
                    suggest('Try setting the `requiresAuth` configuration option to `true`')
                }
                if (!clientId) {
                    suggest('Set the `clientId` configuration option')
                } else {
                    suggest('Verify that you have the correct `clientId` configuration option')
                }

                if (type === "none") {
                    suggest('Your `authType` configuration option is set to "none". Use "backend-services" or "client-credentials" instead.')
                }
                else if (type === "client-credentials") {
                    if (!clientSecret) {
                        suggest('You are using a client-credentials auth but you have not set the `clientSecret` configuration option')
                    } else {
                        suggest('Verify that you have the correct `clientSecret` configuration option')
                    }
                }
                else if (type === "backend-services") {
                    if (!privateKey) {
                        suggest('You are using a client-credentials auth but you don\'t have a `privateKey`. Check the `privateKey` configuration option')
                    } else {
                        suggest('Verify that you have the correct `privateKey`. Check the `privateKey` configuration option')
                    }
                }
            }
        }

        return result
    }
 
    /**
     * Makes a request to the status endpoint and sets `this.statusRequest` and
     * `this.statusResponse`. NOTE that this method expects that the kick-off
     * request has already been made and it will throw otherwise.
     */
    async status()
    {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to check status but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to check status but the kick-off response did not include a " +
                `content-location header. ${getErrorMessageFromResponse(this.kickOffResponse)}`
            );
        }

        const { response } = await this.request<bdt.BulkData.ExportManifest>({
            url : this.kickOffResponse.headers["content-location"],
            requestLabel: "Status Request",
            responseLabel: "Status Response"
        });

        this.statusResponse = response;
    }
 
    /**
     * Makes multiple requests to the status endpoint until the response code
     * is 202 (or until an error is returned). NOTE that this method expects
     * that the kick-off request has already been made and it will throw
     * otherwise.
     * @todo: Use the retry-after header if available
     */
    async waitForExport(suffix = 1): Promise<void>
    {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to wait for export but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to wait for export but the kick-off response did not " +
                `include a content-location header. ${getErrorMessageFromResponse(this.kickOffResponse)}`
            );
        }

        const { request, response } = await this.request<bdt.BulkData.ExportManifest>({
            url : this.kickOffResponse.headers["content-location"],
            responseType : "json",
            requestLabel : "Status Request "  + suffix,
            responseLabel: "Status Response " + suffix
        });

        this.statusRequest  = request
        this.statusResponse = response

        if (response.statusCode === 202) {
            await wait(Math.min(2000 + 1000 * suffix, 10000), this.testApi.abortController.signal);
            return this.waitForExport(suffix + 1);
        }
    }

    /**
     */
     async getExportManifest(res: Response, suffix = 1): Promise<bdt.BulkData.ExportManifest>
     {
         if (!res.headers["content-location"]) {
             throw new Error(
                 "Trying to wait for export but the kick-off response did " +
                 "not include a content-location header"
             );
         }
 
         const { response } = await this.request<bdt.BulkData.ExportManifest>({
             url : res.headers["content-location"],
             responseType : "json",
             requestLabel : "Status Request "  + suffix,
             responseLabel: "Status Response " + suffix
         });
 
         if (response.statusCode === 202) {
             let retryAfterSeconds = 0; 
             let retryAfter = response.headers["retry-after"] || ""
             if (retryAfter.match(/^\d(\.\d+)$/)) {
                retryAfterSeconds = Math.floor(parseFloat(retryAfter))
             } else if (retryAfter) {
                retryAfterSeconds = moment(retryAfter, HTTP_DATE_FORMATS).diff(moment(), "seconds")
             } else {
                retryAfterSeconds = Math.min(1 + suffix, 10);
             }

             await wait(retryAfterSeconds * 1000, this.testApi.abortController.signal);
             return this.getExportManifest(res, suffix + 1);
         }

         if (response.statusCode === 200) {
             return response.body
         }

         console.log(response.statusCode, response.body)
         throw new Error("Could not get export manifest")
     }
 
    /**
     * Starts an export if not started already and resolves with the response
     * of the completed status request
     */
    async getExportResponse() {
        if (!this.statusResponse) {
            if (!this.kickOffResponse) {
                await this.kickOff();
            }
            await this.waitForExport();
        }
        return this.statusResponse;
    }
 
    /**
     * Starts an export and waits for it. Then downloads the file at the given
     * index. NOTE: this method assumes that the index exists and will throw
     * otherwise.
     * @param index The (zero-based) index of the file in the status list
     * @param skipAuth If true, the authorization header will NOT be
     * included, even if the `requiresAuth` property of the server settings is
     * true. If not provided it will be set to true if the requiresAccessToken
     * property of the status response is false.
     */
    async downloadFileAt(index: number, skipAuth?: boolean) {
        if (!this.kickOffRequest) {
            await this.kickOff();
        }
        if (!this.statusRequest) {
            await this.waitForExport();
        }
        let fileUrl;
        try {
            fileUrl = this.statusResponse.body.output[index].url;
        } catch (e) {
            throw new Error(`No file was found at "output[${index}]" in the status response.`);
        }

        if (skipAuth === undefined) {
            skipAuth = this.statusResponse.body.requiresAccessToken === false
        }

        return await this.downloadFile(fileUrl, { skipAuth });
    }
 
    /**
     * Downloads the file at the given fileUrls
     * @param fileUrl The file URL
     * @param options Anything other than `url` (which comes from the first
     * argument) can be passed here to customize the request behavior.
     */
    async downloadFile(fileUrl: string, options: Partial<requestOptions> = {}) {
        const { response } = await this.request<string>({
            url: fileUrl,
            requestLabel: "Download Request",
            responseLabel: "Download Response",
            responseType: "text",
            ...options,
            headers: {
                accept: "application/fhir+ndjson",
                ...options.headers
            }
        });
        return response;
    }
 
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
    async cancelIfStarted(kickOffResponse: Response, labelPrefix = ""): Promise<RequestResult | null>
    {
        if (kickOffResponse &&
            kickOffResponse.statusCode === 202 &&
            kickOffResponse.headers["content-location"]) {
            return await this.cancel(kickOffResponse, labelPrefix);
        }
        return null
    }
 
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
    async cancel(kickOffResponse: Response, labelPrefix = "Unlabeled "): Promise<RequestResult>
    {
        expectSuccessfulKickOff(kickOffResponse, "Failed to cancel export")
        return await this.request({
            url   : kickOffResponse.headers["content-location"],
            method: "DELETE",
            responseType: "json",
            requestLabel: labelPrefix + "Cancellation Request",
            responseLabel: labelPrefix + "Cancellation Response"
        });
    }
}

