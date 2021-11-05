"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkDataClient = void 0;
const got_1 = __importDefault(require("got"));
const errors_1 = require("./errors");
const lib_1 = require("./lib");
const assertions_1 = require("./assertions");
const auth_1 = require("./auth");
const moment_1 = __importDefault(require("moment"));
/**
 * Implements all the interactions with a bulk-data server that tests may need
 * to use. Helps keeping the tests clean and readable.
 */
class BulkDataClient {
    constructor(options, testApi) {
        /**
         * The access token (if any) is stored here so that different parts of
         * the export flow can use it, instead having to re-authorize before
         * each request
         */
        this.accessToken = null;
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
    async getCapabilityStatement() {
        if (this._capabilityStatement === undefined) {
            const { body, error } = await this.request({
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
                this._capabilityStatement = null;
            }
            else {
                this._capabilityStatement = body;
            }
        }
        if (!this._capabilityStatement) {
            throw new Error(`No capability statement found at "${this.options.baseURL}/metadata"`);
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
    createAuthenticationToken(options = {}) {
        return auth_1.createAuthToken({
            tokenEndpoint: this.options.authentication.tokenEndpoint,
            clientId: this.options.authentication.clientId,
            privateKey: this.options.authentication.privateKey,
            expiresIn: this.options.authentication.tokenExpiresIn,
            jwksUrl: this.options.authentication.jwksUrl,
            algorithm: (this.options.authentication.privateKey?.alg ||
                this.options.authentication.tokenSignAlgorithm),
            ...options,
            header: {
                ...this.options.authentication.customTokenHeaders,
                ...options.header
            },
            claims: {
                ...this.options.authentication.customTokenClaims,
                ...options.claims
            }
        });
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
    async request(options) {
        const { requestLabel = "Request", responseLabel = "Response", skipAuth, ...gotOptions } = options;
        let requestError;
        let requestOptions = {
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
                'user-agent': 'BDT (https://github.com/smart-on-fhir/bdt)',
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
                        return response;
                    }
                ],
                beforeError: [
                    error => {
                        requestError = error;
                        if (error.response && error.request) {
                            requestError = lib_1.formatHttpError(error);
                        }
                        return requestError;
                    }
                ],
            }
        };
        if (typeof requestOptions.url === "string" && !requestOptions.url.startsWith("http")) {
            requestOptions.prefixUrl = this.options.baseURL;
            requestOptions.url = requestOptions.url.replace(/^\s*\/+/, "");
        }
        if (this.options.authentication.type !== "none" &&
            // !this.options.authentication.optional &&
            !requestOptions.headers.authorization &&
            !skipAuth &&
            this.options.authentication.tokenEndpoint &&
            requestOptions.url !== this.options.authentication.tokenEndpoint) {
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
        const result = await got_1.default(requestOptions);
        if (result.statusCode === 401 && requestOptions.headers.authorization && !options.context?.retried) {
            this.accessToken = null;
            return this.request({ ...options, context: { ...options.context, retried: true } });
        }
        // console.log(result.request.requestUrl, result.request.options.headers)
        // let body = result.body
        if (typeof result.body === "string" && result.headers["content-type"]?.match(/^application\/(json|fhir+json|json+fhir)/)) {
            result.body = JSON.parse(result.body);
        }
        return {
            response: result,
            request: result.request,
            options: result.request.options,
            error: requestError || null,
            body: result.body
        };
    }
    async authorizeWithCredentials({ requestLabel = "Authorization Request", responseLabel = "Authorization Response" }) {
        const { authentication: { clientId, clientSecret, tokenEndpoint } } = this.options;
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const { body } = await this.request({
            url: tokenEndpoint,
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
    async authorize(options = {}) {
        const { scope, requestLabel = "Authorization Request", responseLabel = "Authorization Response" } = options;
        const { type, clientSecret, tokenEndpoint, scope: configuredScope, } = this.options.authentication;
        if (type === "none") {
            throw new Error('Unable to authorize! This server does not support authentication (according to the "authType" option).');
        }
        if (type === "client-credentials") {
            if (!clientSecret) {
                throw new Error('Unable to authorize! A "clientSecret" option is needed for client-credentials authentication.');
            }
            return await this.authorizeWithCredentials({ requestLabel, responseLabel });
        }
        const authToken = this.createAuthenticationToken();
        const { body, response } = await this.request({
            url: tokenEndpoint,
            requestLabel,
            responseLabel,
            responseType: "json",
            method: "POST",
            prefixUrl: undefined,
            form: {
                scope: scope || configuredScope,
                grant_type: "client_credentials",
                client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                client_assertion: authToken
            }
        });
        if (response.statusCode === 404) {
            this.testApi.console.md('Please make sure you are using valid `tokenEndpoint` configuration option (currently `' + tokenEndpoint + '`)', "info", "Suggestion");
        }
        if (!body.access_token) {
            throw new Error("Unable to authorize. No access token returned.");
        }
        return body.access_token;
    }
    /**
     * This is an internal async getter for the access token.
     */
    async getAccessToken() {
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
    async kickOff(options = {}) {
        const { params, type, skipAuth, labelPrefix = "", ...rest } = options;
        const { systemExportEndpoint, patientExportEndpoint, groupExportEndpoint, baseURL } = this.options;
        let path;
        if (type === "system") {
            path = systemExportEndpoint;
            if (!path) {
                throw new errors_1.NotSupportedError("System-level export is not supported by this server");
            }
        }
        else if (type === "patient") {
            path = patientExportEndpoint;
            if (!path) {
                throw new errors_1.NotSupportedError("Patient-level export is not supported by this server");
            }
        }
        else if (type === "group") {
            path = groupExportEndpoint;
            if (!path) {
                throw new errors_1.NotSupportedError("Group-level export is not supported by this server");
            }
        }
        else {
            path = (systemExportEndpoint || patientExportEndpoint || groupExportEndpoint);
            if (!path) {
                throw new errors_1.NotSupportedError("No export endpoints defined in configuration");
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
                function asArray(x) {
                    return Array.isArray(x) ? x : [x];
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
                            rest.json.parameter = rest.json.parameter.concat(asArray(params[key]).map((id) => ({
                                name: "patient",
                                valueReference: { reference: `Patient/${id}` }
                            })));
                            break;
                        // _type is sent as one or more valueString params
                        case "_type":
                            rest.json.parameter = rest.json.parameter.concat(asArray(params[key]).map((type) => ({
                                name: "_type",
                                valueString: type
                            })));
                            break;
                        // _elements, _typeFilter and includeAssociatedData are sent
                        // as one or more valueString params
                        case "_elements":
                        case "includeAssociatedData":
                        case "_typeFilter":
                            rest.json.parameter = rest.json.parameter.concat(asArray(params[key]).map((type) => ({
                                name: key,
                                valueString: type
                            })));
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
            }
            else {
                for (const key in params) {
                    const param = params[key];
                    if (Array.isArray(param)) {
                        param.forEach((val) => {
                            url.searchParams.append(key, val);
                        });
                    }
                    else {
                        url.searchParams.append(key, param + "");
                    }
                }
            }
        }
        const requestOptions = {
            url,
            ...rest,
            responseType: "json",
            requestLabel: labelPrefix + "Kick-off Request",
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
        const result = await this.request(requestOptions);
        // console.log(result.request.requestUrl, result.request.options.headers, result.response.statusCode, result.body)
        this.kickOffRequest = result.request;
        this.kickOffResponse = result.response;
        // console.log(result)
        if (result.error) {
            if (result.response.statusCode === 401 && !skipAuth) {
                const { optional, clientId, type, privateKey, clientSecret } = this.options.authentication;
                const suggest = (msg) => this.testApi.console.md(msg, "info", "Suggestion");
                if (optional) {
                    suggest('Try setting the `requiresAuth` configuration option to `true`');
                }
                if (!clientId) {
                    suggest('Set the `clientId` configuration option');
                }
                else {
                    suggest('Verify that you have the correct `clientId` configuration option');
                }
                if (type === "none") {
                    suggest('Your `authType` configuration option is set to "none". Use "backend-services" or "client-credentials" instead.');
                }
                else if (type === "client-credentials") {
                    if (!clientSecret) {
                        suggest('You are using a client-credentials auth but you have not set the `clientSecret` configuration option');
                    }
                    else {
                        suggest('Verify that you have the correct `clientSecret` configuration option');
                    }
                }
                else if (type === "backend-services") {
                    if (!privateKey) {
                        suggest('You are using a client-credentials auth but you don\'t have a `privateKey`. Check the `privateKey` configuration option');
                    }
                    else {
                        suggest('Verify that you have the correct `privateKey`. Check the `privateKey` configuration option');
                    }
                }
            }
        }
        return result;
    }
    /**
     * Makes a request to the status endpoint and sets `this.statusRequest` and
     * `this.statusResponse`. NOTE that this method expects that the kick-off
     * request has already been made and it will throw otherwise.
     */
    async status() {
        if (!this.kickOffResponse) {
            throw new Error("Trying to check status but there was no kick-off response");
        }
        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error("Trying to check status but the kick-off response did not include a " +
                `content-location header. ${lib_1.getErrorMessageFromResponse(this.kickOffResponse)}`);
        }
        const { response } = await this.request({
            url: this.kickOffResponse.headers["content-location"],
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
    async waitForExport(suffix = 1) {
        if (!this.kickOffResponse) {
            throw new Error("Trying to wait for export but there was no kick-off response");
        }
        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error("Trying to wait for export but the kick-off response did not " +
                `include a content-location header. ${lib_1.getErrorMessageFromResponse(this.kickOffResponse)}`);
        }
        const { request, response } = await this.request({
            url: this.kickOffResponse.headers["content-location"],
            responseType: "json",
            requestLabel: "Status Request " + suffix,
            responseLabel: "Status Response " + suffix
        });
        this.statusRequest = request;
        this.statusResponse = response;
        if (response.statusCode === 202) {
            await lib_1.wait(Math.min(2000 + 1000 * suffix, 10000));
            return this.waitForExport(suffix + 1);
        }
    }
    /**
     */
    async getExportManifest(res, suffix = 1) {
        if (!res.headers["content-location"]) {
            throw new Error("Trying to wait for export but the kick-off response did " +
                "not include a content-location header");
        }
        const { response } = await this.request({
            url: res.headers["content-location"],
            responseType: "json",
            requestLabel: "Status Request " + suffix,
            responseLabel: "Status Response " + suffix
        });
        if (response.statusCode === 202) {
            let retryAfterSeconds = 0;
            let retryAfter = response.headers["retry-after"] || "";
            if (retryAfter.match(/^\d(\.\d+)$/)) {
                retryAfterSeconds = Math.floor(parseFloat(retryAfter));
            }
            else if (retryAfter) {
                retryAfterSeconds = moment_1.default(retryAfter, assertions_1.HTTP_DATE_FORMATS).diff(moment_1.default(), "seconds");
            }
            else {
                retryAfterSeconds = Math.min(1 + suffix, 10);
            }
            await lib_1.wait(retryAfterSeconds * 1000);
            return this.getExportManifest(res, suffix + 1);
        }
        if (response.statusCode === 200) {
            return response.body;
        }
        console.log(response.statusCode, response.body);
        throw new Error("Could not get export manifest");
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
    async downloadFileAt(index, skipAuth = false) {
        if (!this.kickOffRequest) {
            await this.kickOff();
        }
        if (!this.statusRequest) {
            await this.waitForExport();
        }
        let fileUrl;
        try {
            fileUrl = this.statusResponse.body.output[index].url;
        }
        catch (e) {
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
    async downloadFile(fileUrl, options = {}) {
        const { response } = await this.request({
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
    async cancelIfStarted(kickOffResponse, labelPrefix = "") {
        if (kickOffResponse &&
            kickOffResponse.statusCode === 202 &&
            kickOffResponse.headers["content-location"]) {
            return await this.cancel(kickOffResponse, labelPrefix);
        }
        return null;
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
    async cancel(kickOffResponse, labelPrefix = "Unlabeled ") {
        assertions_1.expectSuccessfulKickOff(kickOffResponse, this.testApi, "Failed to cancel export");
        return await this.request({
            url: kickOffResponse.headers["content-location"],
            method: "DELETE",
            responseType: "json",
            requestLabel: labelPrefix + "Cancellation Request",
            responseLabel: labelPrefix + "Cancellation Response"
        });
    }
}
exports.BulkDataClient = BulkDataClient;
//# sourceMappingURL=BulkDataClient.js.map