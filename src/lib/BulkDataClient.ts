import moment from "moment";
import Request, { NormalizedOptions } from "got/dist/source/core"
import got, { HTTPError, OptionsOfUnknownResponseBody, RequestError, Response } from "got"
import { NotSupportedError } from "./errors"
import { formatHttpError, getErrorMessageFromResponse, wait } from "./lib";
import { TestAPI } from "./TestAPI"
import { expectSuccessfulKickOff, HTTP_DATE_FORMATS } from "./assertions"
import { createAuthToken, createAuthTokenOptions, SupportedJWKAlgorithm } from "./auth"
import { NormalizedConfig } from "./Config"
// @ts-ignore
import pkg from "../../package.json"

export namespace FHIR {
    
    export interface Resource<T = string> extends Record<string, any> {
        resourceType: T
    }

    export interface CapabilityStatement extends Resource<"CapabilityStatement"> {}

    export interface OperationOutcome extends Resource<"OperationOutcome"> {}
}

export namespace BulkData {
    /**
     * The response expected upon successful kick-off and status pulling 
     */
    export interface ExportManifest {
            
        /**
         * indicates the server's time when the query is run. The response
         * SHOULD NOT include any resources modified after this instant,
         * and SHALL include any matching resources modified up to and
         * including this instant.
         * Note: To properly meet these constraints, a FHIR Server might need
         * to wait for any pending transactions to resolve in its database
         * before starting the export process.
         */
        transactionTime: string // FHIR instant

        /**
         * the full URL of the original bulk data kick-off request
         */
        request: string

        /**
         * indicates whether downloading the generated files requires a
         * bearer access token.
         * Value SHALL be true if both the file server and the FHIR API server
         * control access using OAuth 2.0 bearer tokens. Value MAY be false for
         * file servers that use access-control schemes other than OAuth 2.0,
         * such as downloads from Amazon S3 bucket URLs or verifiable file
         * servers within an organization's firewall.
         */
        requiresAccessToken: boolean
        
        /**
         * an array of file items with one entry for each generated file.
         * If no resources are returned from the kick-off request, the server
         * SHOULD return an empty array.
         */
        output: ExportManifestFile[]

        /**
         * array of error file items following the same structure as the output
         * array.
         * Errors that occurred during the export should only be included here
         * (not in output). If no errors occurred, the server SHOULD return an
         * empty array. Only the OperationOutcome resource type is currently
         * supported, so a server SHALL generate files in the same format as
         * bulk data output files that contain OperationOutcome resources.
         */
        error: ExportManifestFile<"OperationOutcome">[]

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
        deleted?: ExportManifestFile<"Bundle">[]

        /**
         * To support extensions, this implementation guide reserves the name
         * extension and will never define a field with that name, allowing
         * server implementations to use it to provide custom behavior and
         * information. For example, a server may choose to provide a custom
         * extension that contains a decryption key for encrypted ndjson files.
         * The value of an extension element SHALL be a pre-coordinated JSON
         * object.
         */
        extension?: Record<string, any>
    }

    /**
     * Each file or output entry in export manifest
     */
    export interface ExportManifestFile<Type = string> {
        
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
        type: Type

        /**
         * the path to the file. The format of the file SHOULD reflect that
         * requested in the _outputFormat parameter of the initial kick-off
         * request.
         */
        url: string 

        /**
         * the number of resources in the file, represented as a JSON number.
         */
        count?: number
    }

    export type StatusResponse<T=ExportManifest | FHIR.OperationOutcome | void> = Response<T>
}

export namespace OAuth {
    export type errorType = (
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
        "invalid_scope"
    )
   
    export interface ErrorResponse {

        error: errorType

        /**
         * OPTIONAL.  Human-readable ASCII [USASCII] text providing
         * additional information, used to assist the client developer in
         * understanding the error that occurred.
         */
        error_description?: string

        /**
         * OPTIONAL.  A URI identifying a human-readable web page with
         * information about the error, used to provide the client
         * developer with additional information about the error.
         * Values for the "error_uri" parameter MUST conform to the
         */
        error_uri?: string
    }

    /**
     * Access token response
     */
    export interface TokenResponse {

        /**
         * The access token issued by the authorization server.
         */
        access_token: string

        /**
         * Fixed value: bearer.
         */
        token_type:	"bearer"

        /**
         * The lifetime in seconds of the access token. The recommended value
         * is 300, for a five-minute token lifetime.
         */
        expires_in: number

        /**
         * Scope of access authorized. Note that this can be different from the
         * scopes requested by the app.
         */
        scope: string
    }
}



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
    private _capabilityStatement?: FHIR.CapabilityStatement;

    /**
     * The access token (if any) is stored here so that different parts of
     * the export flow can use it, instead having to re-authorize before
     * each request
     */
    accessToken: string | null = null;

    options: NormalizedConfig;
    
    testApi: TestAPI;
    
    kickOffRequest?: Request;
    kickOffResponse?: Response;
    statusRequest?: Request;
    statusResponse?: Response<BulkData.ExportManifest>

    constructor(options: NormalizedConfig, testApi: TestAPI)
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
            const { body, error } = await this.request<FHIR.CapabilityStatement>({
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
    createAuthenticationToken(options: Partial<createAuthTokenOptions> = {}): string {
        return createAuthToken({
            tokenEndpoint: this.options.authentication.tokenEndpoint,
            clientId     : this.options.authentication.clientId,
            privateKey   : this.options.authentication.privateKey,
            expiresIn    : this.options.authentication.tokenExpiresIn,
            jwksUrl      : this.options.authentication.jwksUrl,
            algorithm    : (
                this.options.authentication.privateKey?.alg ||
                this.options.authentication.tokenSignAlgorithm
            ) as SupportedJWKAlgorithm,                       
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
                    (response) => {
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

        const result = await got(requestOptions)

        if (result.statusCode === 401 && requestOptions.headers.authorization && !options.context?.retried) {
            this.accessToken = null
            return this.request<BodyType>({ ...options, context: { ...options.context, retried: true }})
        }

        // console.log(result.request.requestUrl, result.request.options.headers)

        // let body = result.body
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

        const { body } = await this.request<OAuth.TokenResponse>({
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

        const { body, response } = await this.request<OAuth.TokenResponse>({
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
     *         prefer: ["respond-async", "handling=lenient"]
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

        const { response } = await this.request<BulkData.ExportManifest>({
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

        const { request, response } = await this.request<BulkData.ExportManifest>({
            url : this.kickOffResponse.headers["content-location"],
            responseType : "json",
            requestLabel : "Status Request "  + suffix,
            responseLabel: "Status Response " + suffix
        });

        this.statusRequest  = request
        this.statusResponse = response

        if (response.statusCode === 202) {
            await wait(Math.min(2000 + 1000 * suffix, 10000));
            return this.waitForExport(suffix + 1);
        }
    }

    /**
     */
     async getExportManifest(res: Response, suffix = 1): Promise<BulkData.ExportManifest>
     {
         if (!res.headers["content-location"]) {
             throw new Error(
                 "Trying to wait for export but the kick-off response did " +
                 "not include a content-location header"
             );
         }
 
         const { response } = await this.request<BulkData.ExportManifest>({
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

             await wait(retryAfterSeconds * 1000);
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
     * true. 
     */
    async downloadFileAt(index: number, skipAuth = false) {
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
        expectSuccessfulKickOff(kickOffResponse, this.testApi, "Failed to cancel export")
        return await this.request({
            url   : kickOffResponse.headers["content-location"],
            method: "DELETE",
            responseType: "json",
            requestLabel: labelPrefix + "Cancellation Request",
            responseLabel: labelPrefix + "Cancellation Response"
        });
    }
}

