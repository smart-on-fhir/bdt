const request  = require("request");
const crypto   = require("crypto");
const jwt      = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const expect   = require("code").expect;
const { URL }  = require("url");
const jwk      = require("jwk-lite");
const util     = require("util");


/**
 * Generates a JWKS containing a public and a private key pair
 * @param {"RS384"|"ES384"} alg The algorithm to use
 */
function createJWKS(alg = "RS384") {
    // @ts-ignore
    alg = String(alg || "").toUpperCase();
    if (["RS384", "ES384"].indexOf(alg) === -1) {
        alg = "RS384";
    }

    return jwk.generateKey(alg).then(result => {
        return Promise.all([
            jwk.exportKey(result.publicKey),
            jwk.exportKey(result.privateKey)
        ]).then(keys => {
            let out = { keys: [...keys] };
            let kid = crypto.randomBytes(16).toString("hex");
            out.keys.forEach(key => {
                key.kid = kid;
                if (!key.alg) {
                    key.alg = alg;
                }
            });
            return out;
        });
    });
}

/**
 * Deletes all the properties of an object that have value equal to the provided
 * one. This is useful to filter out undefined values for example.
 * @param {Object} obj The object to modify
 * @param {*} value The value to look for
 * @param {Boolean} deep If true the function will walk recursively into nested objects
 */
function stripObjectValues(obj, value, deep)
{
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const val = obj[key];
            if (deep && val && typeof val == "object" && val !== obj) {
                stripObjectValues(val, value, deep);
            }
            if (val === value) {
                delete obj[key];
            }
        }
    }
    return obj;
}

/**
 * A wrapper for the request function. Returns the request object that you
 * can either pipe to, or use `request(options).promise().then().catch()`
 * @param {Object|String} options
 */
function customRequest(options)
{
    /**
     * @type {*}
     */
    let req = {};

    const promise = new Promise((resolve, reject) => {

        if (typeof options == "string") {
            options = { url: options };
        }

        try {
            req = request(options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                resolve({ response, body, request: req });
            });
        }
        catch (error) {
            reject(error);
        }
    });

    req.promise = () => promise;

    return req;
}

/**
 * Simple utility for waiting. Returns a promise that will resolve after @ms
 * milliseconds.
 * @param {Number} ms 
 */
function wait(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if the given @response has the desired status @code
 * @param {request.Response} response The response to check
 * @param {Number} code The expected status code
 * @param {String} message Optional custom message
 */
function expectStatusCode(response, code, message = "")
{
    expect(
        response.statusCode,
        `${message || `response.statusCode must be "${code}"`}. ${getResponseError(response)}`
    ).to.equal(code);
}

/**
 * Check if the given @response has the desired status @text
 * @param {request.Response} response The response to check
 * @param {String} text The expected status text
 * @param {String} message Optional custom message
 */
function expectStatusText(response, text, message = "")
{
    expect(
        response.statusMessage,
        `${message || `response.statusMessage must be "${text}"`}. ${getResponseError(response)}`
    ).to.equal(text);
}

/**
 * Check if the given @response has a 401 status code
 * @param {request.Response} response The response to check
 * @param {String} message Optional custom message
 */
function expectUnauthorized(response, message = "")
{
    expectStatusCode(response, 401, message);

    // Some servers return empty statusMessage
    // TODO: Decide if we need to do this. Is 401 ok with custom status text?
    if (response.statusMessage) {
        expectStatusText(response, "Unauthorized", message);
    }
}

/**
 * Verify that the response is JSON
 * @param {request.Response} response The response to check
 * @param {String} message Optional custom message
 */
function expectJson(
    response,
    message = "the server must reply with JSON content-type header (" +
        "application/json, application/json+fhir or application/fhir+json)"
)
{
    expect(
        [
            "application/json",
            "application/json+fhir",
            "application/fhir+json"
        ],
        message + "." + getResponseError(response)
    ).to.include(String(response.headers["content-type"] || "").toLowerCase().split(";").shift());
}

/**
 * Verify that the response body contains an OperationOutcome
 * @param {request.Response} response The response to check
 * @param {String} message Optional custom message
 */
function expectOperationOutcome(response, message = "")
{
    message = message ? message + " " : message;

    if (!response.body) {
        throw new Error(
            message + "Expected the request to return an OperationOutcome but " +
            "the response has no body."
        );
    }

    if (response.headers["content-type"].startsWith("application/xml")) {
        if (!response.body.match(/^<OperationOutcome\b.*?<\/OperationOutcome>$/)) {
            throw new Error(
                message + "Expected the request to return an OperationOutcome"
            );
        }
    }
    else if (response.headers["content-type"].startsWith("application/json")) {
        let body;
        if (typeof response.body == "string") {
            try {    
                body = JSON.parse(response.body);
            } catch (ex) {
                throw new Error(
                    message + "Expected the request to return an " + 
                    "OperationOutcome but the response body cannot be parsed as JSON."
                );
            }
        } else {
            body = response.body;
        }

        if (body.resourceType !== "OperationOutcome") {
            throw new Error(
                message + "Expected the request to return an OperationOutcome"
            );
        }
    }
}

/**
 * Creates an authentication token
 * @param {Object} claims 
 * @param {Object} signOptions 
 * @param {Object} privateKey 
 */
function createClientAssertion(claims = {}, signOptions = {}, privateKey)
{
    let jwtToken = {
        // exp: Math.round(Date.now() / 1000) + 300, // 5 min
        jti: crypto.randomBytes(32).toString("hex"),
        ...claims
    };

    const _signOptions = {
        algorithm: privateKey.alg,
        keyid: privateKey.kid,
        expiresIn: 300, // 5 min
        ...signOptions,
        header: {
            // jku: jwks_url || undefined,
            kty: privateKey.kty,
            ...signOptions.header
        }
    };

    return jwt.sign(jwtToken, jwkToPem(privateKey, { private: true }), _signOptions);
}

function authenticate(tokenUrl, postBody) {
    return customRequest({
        method: "POST",
        url   : tokenUrl,
        json  : true,
        headers  :  { ...this.options.customHeaders },
        form  : {
            scope: "system/*.*",
            grant_type: "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            // client_assertion: signedToken,
            ...postBody
        }
    });
}

/**
 * Given a response object, generates and throws detailed HttpError.
 * @param {request.Response} resp The `Response` object of a failed `fetch` request
 */
function getResponseError(resp)
{
    let msg = `${resp.request.method} ${resp.request.uri.href} returned ${resp.statusCode} ${resp.statusMessage}`;

    try {
        const type = resp.headers["content-type"] || "text/plain";

        if (type.match(/\bjson\b/i)) {
            let json;
            if (typeof resp.body == "string") {
                json = JSON.parse(resp.body);
            }
            if (typeof resp.body == "object") {
                json = resp.body;
            }

            if (json.resourceType == "OperationOutcome") {
                msg += "; " + json.issue.map(i => i.details.text).join("; ");
            }
            else {
                msg += "; " + truncate(util.inspect(json), 500);
            }
        }
        else if (type.match(/^text\//i)) {
            let txt = String(resp.body).trim();
            if (txt != resp.statusMessage) {
                msg += "; " + truncate(resp.body, 500);
            }
        }
    } catch (_) {
        // ignore
    }

    return msg;
}

function truncate(str, maxLength = 5) {
    if (str.length <= maxLength) {
        return str;
    }
    let middle = Math.floor(maxLength / 2);
    return str.substr(0, middle) + "..." + str.substr(-middle);
}

/**
 * Walks thru an object (ar array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param {Object} obj The object (or Array) to walk through
 * @param {String} path The path (eg. "a.b.4.c")
 * @returns {*} Whatever is found in the path or undefined
 */
function getPath(obj, path = "")
{
    return path.split(".").reduce((out, key) => out ? out[key] : undefined, obj)
}

/**
 * Implements all the interactions with a bulk-data server that tests may need
 * to use. Helps keeping the tests clean and readable.
 */
class BulkDataClient
{
    /**
     * The systemExportEndpoint if supported by the server
     */
    // _systemExportEndpoint;

    /**
     * The patientExportEndpoint if supported by the server
     */
    // _patientExportEndpoint;

    /**
     * The groupExportEndpoint if supported by the server
     */
    // _groupExportEndpoint;

    /**
     * The capability statement
     */
    // _capabilityStatement;

    constructor(options, testApi, uri)
    {
        if (!options.baseURL) {
            throw new Error("A baseURL option is required");
        }

        this.options         = options;
        this.testApi         = testApi;
        this.url             = options.baseURL.replace(/\/*$/, "/");
        this.kickOffRequest  = null;
        this.kickOffResponse = null;
        this.statusRequest   = null;
        this.statusResponse  = null;
        this.cancelRequest   = null;
        this.cancelResponse  = null;
        this.accessToken     = null;

        if (options.systemExportEndpoint) {
            this._systemExportEndpoint  = options.systemExportEndpoint;
        }
        if (options.patientExportEndpoint) {
            this._patientExportEndpoint = options.patientExportEndpoint;
        }
        if (options.groupExportEndpoint) {
            this._groupExportEndpoint   = options.groupExportEndpoint;
        }
    }

    ///////////////////////////////////////////////////////////////////////////

    async getCapabilityStatement(cfg, api)
    {
        if (!this._capabilityStatement) {
            this._capabilityStatement = (await customRequest({
                uri      : `${this.options.baseURL}/metadata?_format=json`,
                json     : true,
                strictSSL: false,
                headers: {
                    ...this.options.customHeaders,
                    accept: "application/fhir+json,application/json+fhir,application/json"
                }
            }).promise()).body;
        }

        return this._capabilityStatement;
    }

    async getSystemExportEndpoint()
    {
        if (this._systemExportEndpoint === undefined) {
            const capabilityStatement = await this.getCapabilityStatement();
            const operations = getPath(capabilityStatement, "rest.0.operation") || [];
            const definition = operations.find(e => e.name === "export");
            this._systemExportEndpoint = definition ? "$export" : null;
        }

        return this._systemExportEndpoint;
    }

    async getGroupExportEndpoint()
    {
        if (this._groupExportEndpoint === undefined) {
            if (!this.options.groupId) {
                this._groupExportEndpoint = null;
            } else {
                const capabilityStatement = await this.getCapabilityStatement();
                let supported;
                try {
                    supported = !!capabilityStatement.rest[0].resource.find(
                        x => x.type === "Group"
                    ).operation.find(x => x.name = "group-export");
                } catch {
                    supported = false;
                }
                this._groupExportEndpoint = supported ? `Group/${this.options.groupId}/$export` : null;
            }
        }

        return this._groupExportEndpoint;
    }

    async getPatientExportEndpoint()
    {
        if (this._patientExportEndpoint === undefined) {
            const capabilityStatement = await this.getCapabilityStatement();
            let supported;
            try {
                supported = !!capabilityStatement.rest[0].resource.find(
                    x => x.type === "Patient"
                ).operation.find(x => x.name = "patient-export");
            } catch {
                supported = false;
            }
            this._patientExportEndpoint = supported ? "Patient/$export" : null;
        }

        return this._patientExportEndpoint;
    }

    ///////////////////////////////////////////////////////////////////////////

    /**
     * The purpose of this method is to attach some common properties (like
     * strictSSL and authorization header) to the request options if needed,
     * and then make the the request.
     * @param {Object} options
     * @param {Boolean} skipAuth If true, the authorization header will NOT be
     * included, even if the `requiresAuth` property of the server settings is
     * true.
     */
    async request(options = {}, skipAuth = false)
    {
        let requestOptions = {
            strictSSL: this.options.strictSSL,
            ...options,
            headers: {
                ...this.options.customHeaders,
                ...options.headers
            }
        };

        if (this.options.authType && this.options.authType != "none" && this.options.requiresAuth && !skipAuth) {
            const accessToken = await this.getAccessToken();
            requestOptions.headers = {
                ...requestOptions.headers,
                authorization: "Bearer " + accessToken
            };
        }

        stripObjectValues(requestOptions, undefined, true);
        return customRequest(requestOptions);
    }

    async authorizeWithCredentials({ requestLabel, responseLabel })
    {
        const authHeader = Buffer.from(
            `${this.options.clientId}:${this.options.clientSecret}`
        ).toString("base64");

        const request = customRequest({
            method   : "POST",
            uri      : this.options.tokenEndpoint,
            strictSSL: !!this.options.strictSSL,
            json     : true,
            headers: {
                ...this.options.customHeaders,
                authorization: `Basic ${authHeader}`
            }
        });

        this.testApi.logRequest(request, requestLabel || "Authorization Request");
        const { response } = await request.promise();
        this.testApi.logResponse(response, responseLabel || "Authorization Response");

        if (!response.body.access_token) {
            throw new Error(
                `Unable to authorize. ${getResponseError(response)}`
            );
        }

        return response.body.access_token;
    }

    /**
     * Makes an authorization request and logs the request and the response.
     * @param {Object} options
     * @param {String} [options.scope] Scopes to request (default "system/*.read")
     * @param {String} [options.requestLabel] A label for this request to be rendered in UI. Defaults to "Authorization Request"
     * @param {String} [options.responseLabel] A label for the response to be rendered in UI. Defaults to "Authorization Response"
     */
    async authorize({ scope, requestLabel, responseLabel })
    {
        if (this.options.authType == "none") {
            throw new Error('Unable to authorize! This server does not support authentication (according to the "authType" option).');
        }

        if (this.options.authType == "client-credentials") {
            if (!this.options.clientSecret) {
                throw new Error('Unable to authorize! A "clientSecret" option is needed for client-credentials authentication.');
            }
            return await this.authorizeWithCredentials({ requestLabel, responseLabel });
        }

        const request = customRequest({
            method   : "POST",
            uri      : this.options.tokenEndpoint,
            json     : true,
            strictSSL: !!this.options.strictSSL,
            headers  :  { ...this.options.customHeaders },
            form     : {
                scope                : scope || this.options.scope || "system/*.read",
                grant_type           : "client_credentials",
                client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                client_assertion     : createClientAssertion({
                    aud: this.options.tokenEndpoint,
                    iss: this.options.clientId,
                    sub: this.options.clientId
                }, {}, this.options.privateKey)
            }
        });

        this.testApi.logRequest(request, requestLabel || "Authorization Request");
        const { response } = await request.promise();
        this.testApi.logResponse(response, responseLabel || "Authorization Response");

        if (!response.body.access_token) {
            throw new Error(
                `Unable to authorize. ${getResponseError(response)}`
            );
        }

        return response.body.access_token;
    }

    /**
     * This is an async getter for the access token. 
     * @param {object} options
     * @param {boolean} [options.force] Set to true to make the client re-authorize,
     * even if it currently has an access token
     * @param {string} [options.scope] Scopes to request (default "system/*.read")
     * @param {string} [options.requestLabel]
     * @param {string} [options.responseLabel]
     */
    async getAccessToken(options = {})
    {
        if (!this.accessToken || options.force) {
            this.accessToken = await this.authorize(options);
        }
        return this.accessToken;
    }

    /**
     * Starts an export by making a request to the kick-off endpoint. Custom
     * request options can be passed to override the default ones. If any of
     * those option has undefined value it will actually remove that property.
     * For example, ti remove the accept header you can pass
     * `{ headers: { accept: undefined }}`.
     * @param {Object} options Custom request options
     */
    async kickOff(options = {}, labelPrefix = "")
    {
        const { params, type, skipAuth, ...rest } = options;

        let path;
        if (type == "system") {
            path = await this.getSystemExportEndpoint();
            if (!path) {
                throw new NotSupportedError("System-level export is not supported by this server");
            }
        } else if (type == "patient") {
            path = await this.getPatientExportEndpoint();
            if (!path) {
                throw new NotSupportedError("Patient-level export is not supported by this server");
            }
        } else if (type == "group") {
            path = await this.getGroupExportEndpoint();
            if (!path) {
                throw new NotSupportedError("Group-level export is not supported by this server");
            }
        } else {
            path = await this.getSystemExportEndpoint() ||
                   await this.getPatientExportEndpoint() ||
                   await this.getGroupExportEndpoint();
            if (!path) {
                throw new NotSupportedError("No export endpoints defined in configuration");
            }
        }

        const url = new URL(path, this.url);

        
        if (params && typeof params == "object") {
            if (rest.method == "POST") {
                rest.body = {
                    resourceType: "Parameters",
                    parameter: []
                };
                for (const key in params) {
                    switch (key) {
                        case "_since":
                            rest.body.parameter.push({
                                name: "_since",
                                valueInstant: params[key]
                            });
                        break;
                        case "patient":
                            rest.body.parameter = rest.body.parameter.concat(
                                params[key].map(id => ({
                                    name : "patient",
                                    valueReference : { reference: `Patient/${id}` }
                                }))
                            );
                        break;
                        case "_type":
                            rest.body.parameter = rest.body.parameter.concat(
                                params[key].map(type => ({
                                    name : "_type",
                                    valueString : type
                                }))
                            );
                        break;
                        case "_outputFormat":
                        case "_elements":
                        case "_includeAssociatedData":
                        case "_typeFilter":
                            rest.body.parameter.push({
                                name: key,
                                valueString: params[key]
                            });
                        break;
                    }
                }
            } else {
                for (const key in params) {
                    url.searchParams.append(key, params[key]);
                }
            }
        }

        const requestOptions = {
            url,
            json: true,
            strictSSL: !!this.options.strictSSL,
            ...rest,
            headers: {
                accept: "application/fhir+json",
                prefer: "respond-async",
                ...rest.headers
            }
        };

        // console.log(requestOptions)

        this.kickOffRequest = await this.request(
            requestOptions,
            skipAuth === undefined ?
                Object.keys(requestOptions.headers).some(name => name.toLocaleLowerCase() === "authorization") :
                !!skipAuth
        );
        this.testApi.logRequest(this.kickOffRequest, labelPrefix + "Kick-off Request");
        const { response } = await this.kickOffRequest.promise();
        this.kickOffResponse = response;
        this.testApi.logResponse(this.kickOffResponse, labelPrefix + "Kick-off Response");
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
                `content-location header. ${getResponseError(this.kickOffResponse)}`
            );
        }

        this.statusRequest = await this.request({
            uri : this.kickOffResponse.headers["content-location"],
            json: true
        });

        this.testApi.logRequest(this.statusRequest, "Status Request");
        const { response } = await this.statusRequest.promise();
        this.statusResponse = response;
        this.testApi.logResponse(this.statusResponse, "Status Response");
    }

    /**
     * Makes multiple requests to the status endpoint until the response code is
     * 202 (or until an error is returned). NOTE that this method expects that
     * the kick-off request has already been made and it will throw otherwise.
     * TODO: Use the retry-after header if available
     */
    async waitForExport(suffix = 1) {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to wait for export but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to wait for export but the kick-off response did not " +
                `include a content-location header. ${getResponseError(this.kickOffResponse)}`
            );
        }

        this.statusRequest = await this.request({
            uri : this.kickOffResponse.headers["content-location"],
            json: true
        });

        if (suffix === 1) {
            this.testApi.logRequest(this.statusRequest, "Status Request");
        }
        const { response } = await this.statusRequest.promise();
        this.statusResponse = response;
        this.testApi.logResponse(this.statusResponse, "Status Response " + suffix);
        if (response.statusCode === 202) {
            await wait(Math.min(1000 + 1000 * suffix, 10000));
            return this.waitForExport(suffix + 1);
        }
    }

    /**
     * Starts an export if not started already and resolves with the response
     * of the completed status request
     */
    async getExportResponse() {
        if (!this.statusResponse) {
            await this.kickOff();
            await this.waitForExport();
        }
        return this.statusResponse;
    }

    /**
     * Starts an export and waits for it. Then downloads the file at the given
     * index. NOTE: this method assumes that the index exists and will throw
     * otherwise.
     * @param {Number} index The index of the file in the status list
     * @param {Boolean} skipAuth If true, the authorization header will NOT be
     * included, even if the `requiresAuth` property of the server settings is
     * true. 
     */
    async downloadFileAt(index, skipAuth = null) {
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
        return await this.downloadFile(fileUrl, skipAuth);
    }

    /**
     * Downloads the file at the given fileUrl
     * @param {string} fileUrl The file URL
     * @param {boolean} skipAuth If true, the authorization header will NOT be
     * included, even if the `requiresAuth` property of the server settings is
     * true. 
     */
    async downloadFile(fileUrl, skipAuth = null) {
        const req = await this.request({
            uri: fileUrl,
            // json: true,
            gzip: true,
            headers: {
                accept: "application/fhir+ndjson"
            }
        }, skipAuth);
        this.testApi.logRequest(req, "Download Request");
        const { response } = await req.promise();
        this.testApi.logResponse(response, "Download Response");
        return response;
    }

    /**
     * Cancels an export by sending a DELETE request to the status endpoint.
     * If an export has not been started does nothing.
     */
    async cancelIfStarted()
    {
        if (this.kickOffResponse &&
            this.kickOffResponse.statusCode === 202 &&
            this.kickOffResponse.headers["content-location"]) {
            await this.cancel();
        }
    }

    /**
     * Cancels an export by sending a DELETE request to the status endpoint.
     * NOTE that this method expects an export to be started and will throw
     * otherwise. Use `this.cancelIfStarted()` if you are not sure if an export
     * has been started.
     */
    async cancel()
    {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to cancel but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to cancel but the kick-off response did not include a " +
                `content-location header. ${getResponseError(this.kickOffResponse)}`
            );
        }

        this.cancelRequest = await this.request({
            uri   : this.kickOffResponse.headers["content-location"],
            method: "DELETE",
            json  : true
        });

        this.testApi.logRequest(this.cancelRequest, "Cancellation Request");
        const { response } = await this.cancelRequest.promise();
        this.cancelResponse = response;
        this.testApi.logResponse(this.cancelResponse, "Cancellation Response");
    }

    /**
     * Verifies that a request sent to the kick-off endpoint was not successful.
     */
    expectFailedKickOff()
    {
        expect(
            this.kickOffResponse.statusCode,
            `The kick-off request was expected to fail. ${getResponseError(this.kickOffResponse)}`
        ).to.be.above(399);
        
        // Some servers return empty status message (regardless of the status code).
        // This is odd, but we allow it here as it is not critical
        if (this.kickOffResponse.statusMessage) {
            expectStatusText(this.kickOffResponse, "Bad Request", "kickOffResponse.statusMessage");
        }

        expectOperationOutcome(
            this.kickOffResponse,
            "In case of error the server should return an OperationOutcome."
        );
    }

    /**
     * Verifies that a request sent to the kick-off endpoint was not successful.
     */
    expectSuccessfulKickOff()
    {
        expect(
            this.kickOffResponse.statusCode,
            `The kick-off request was expected to succeed and return a 202 status code. ${getResponseError(this.kickOffResponse)}`
        ).to.equal(202);

        expect(
            this.kickOffResponse.headers,
            `The kick-off response must include a content-location header. ${getResponseError(this.kickOffResponse)}`
        ).to.include("content-location");

        // The body is optional but if set, it must be OperationOutcome
        if (this.kickOffResponse.body) {
            expectOperationOutcome(this.kickOffResponse);
        }
    }
}

class NotSupportedError extends Error {}

module.exports = {
    request: customRequest,
    createClientAssertion,
    expectOperationOutcome,
    expectStatusCode,
    expectUnauthorized,
    expectJson,
    wait,
    BulkDataClient,
    createJWKS,
    authenticate,
    getResponseError,
    NotSupportedError
};
