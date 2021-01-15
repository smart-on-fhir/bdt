const { expect } = require("code");
const {
    request,
    expectUnauthorized,
    expectOperationOutcome,
    expectJson,
    createClientAssertion,
    createJWKS,
    expectStatusCode,
    authenticate,
    getResponseError,
    BulkDataClient,
    NotSupportedError
} = require("./lib");



async function getAccessToken(cfg, body= {}, signOptions = {})
{
    const response = await request({
        method   : "POST",
        uri      : cfg.tokenEndpoint,
        json     : true,
        strictSSL: !!cfg.strictSSL,
        headers  : { ...cfg.customHeaders },
        form     : {
            scope                : cfg.scope || "system/*.read",
            grant_type           : "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion     : createClientAssertion({
                aud: cfg.tokenEndpoint,
                iss: cfg.clientId,
                sub: cfg.clientId,
                ...body
            }, signOptions, cfg.privateKey)
        }
    }).promise();

    // console.log("response.body:", response.body)

    return response.body.access_token;
}

module.exports = function(describe, it, before, after, beforeEach, afterEach) {
    describe("Authorization", () => {
        
        // A few tests that are the same for each of the kick-off endpoints
        ["system", "patient", "group"].forEach((type, i) => {
            let y = 0;
            describe(`Kick-off request at the ${type}-level export endpoint`, () => {

                it ({
                    id  : `Auth-01.${i}.${y++}`,
                    name: `Requires authorization header`,
                    description: `The server should require authorization header at the ${type}-level export endpoint`
                }, async function(cfg, api) {
                    api.prerequisite(
                        {
                            assertion: cfg.authType != "none",
                            message: "This server does not support authorization"
                        },
                        {
                            assertion: cfg.requiresAuth,
                            message: "This server does not require authorization"
                        }
                    );
                    
                    const client = new BulkDataClient(cfg, api);
                    await client.kickOff({ type, skipAuth: true });
                    client.cancelIfStarted();

                    expectUnauthorized(
                        client.kickOffResponse,
                        "The server must not accept kick-off requests without authorization header"
                    );
                    expectJson(
                        client.kickOffResponse,
                        "The body SHALL be a FHIR OperationOutcome resource in JSON format"
                    );
                    expectOperationOutcome(
                        client.kickOffResponse,
                        "The body SHALL be a FHIR OperationOutcome resource in JSON format"
                    );
                });

                it ({
                    id  : `Auth-01.${i}.${y++}`,
                    name: `Rejects invalid token`,
                    description: `The server should reject invalid tokens at the ${type}-level export endpoint`,
                }, async function(cfg, api) {

                    api.prerequisite(
                        {
                            assertion: cfg.authType != "none",
                            message: "This server does not support authorization"
                        }
                    );

                    const client = new BulkDataClient(cfg, api);
                    await client.kickOff({ type, headers: { authorization: "Bearer invalidToken" }});
                    client.cancelIfStarted();

                    expectUnauthorized(
                        client.kickOffResponse,
                        "The server must not accept kick-off requests with invalid token in the authorization header"
                    );
                    expectJson(
                        client.kickOffResponse,
                        "The body SHALL be a FHIR OperationOutcome resource in JSON format"
                    );
                    expectOperationOutcome(
                        client.kickOffResponse,
                        "The body SHALL be a FHIR OperationOutcome resource in JSON format"
                    );
                });
            });
        });

        describe("Token endpoint", () => {

            let hasTokenEndpoint;

            beforeEach(async (cfg, api) => {
                if (hasTokenEndpoint === undefined) {
                    if (cfg.tokenEndpoint) {
                        const req = request({
                            method   : "POST",
                            uri      : cfg.tokenEndpoint,
                            strictSSL: !!cfg.strictSSL,
                            headers  :  { ...cfg.customHeaders },
                        });
                        const { response } = await req.promise();
                        hasTokenEndpoint = response.statusCode >= 200 && response.statusCode !== 404;
                    } else {
                        hasTokenEndpoint = false;
                    }
                }

                if (!hasTokenEndpoint) {
                    throw new NotSupportedError("No usable token endpoint found");
                }
            });

            it ({
                id  : `Auth-02`,
                name: 'Requires "application/x-www-form-urlencoded" POSTs',
                description: "After generating an authentication JWT, the client " +
                    "requests a new access token via HTTP POST to the FHIR " + 
                    "authorization server's token endpoint URL, using content-type " +
                    "`application/x-www-form-urlencoded`."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers: {
                        ...cfg.customHeaders,
                        "Content-type": "application/json"
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(response.statusCode, "Token endpoint returned 404 Not Found").to.not.equal(404);

                expect(
                    response.statusCode,
                    "response.statusCode must be >=400 if another content-type " +
                    `request header is sent. ${getResponseError(response)}`
                ).to.be.above(399);
            });

            it ({
                id  : `Auth-03`,
                name: "The 'grant_type' parameter must be present",
                description: "The server should reply with 400 Bad Request if the " +
                    "`grant_type parameter` is not sent by the client."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form     : {
                        scope                : cfg.scope || "system/*.read",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if grant_type is not sent. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-04`,
                name: 'The "grant_type" must equal "client_credentials"',
                description: "The server should reply with 400 Bad Request if the " +
                    "`grant_type parameter` is not `client_credentials`."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form     : {
                        scope                : cfg.scope || "system/*.read",
                        grant_type           : "test-grant_type-value",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if grant_type is not sent. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-05`,
                name: 'The "client_assertion_type" must be present',
                description: "The server should reply with 400 Bad Request if the " +
                    "`client_assertion_type` parameter is not sent by the client."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope           : cfg.scope || "system/*.read",
                        grant_type      : "client_credentials",
                        client_assertion: createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if grant_type is not sent. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-06`,
                name: 'The "client_assertion_type" must be jwt-bearer',
                description: "The server should reply with 400 Bad Request if the " +
                    "`client_assertion_type` parameter is not equal to " +
                    "`urn:ietf:params:oauth:client-assertion-type:jwt-bearer`."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : cfg.scope || "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "test-client_assertion_type-value",
                        client_assertion     : createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if client_assertion_type " +
                    `is not valid. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-07`,
                name: "The client_assertion parameter must be a token",
                description: "This test verifies that if the client sends something " +
                    "other then a JWT, the server will detect it and reject the request."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "system/Patient.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : "x.y.z"
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if the client_assertion is not a valid JWT. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-08`,
                name: "Validates authenticationToken.aud",
                description: "The `aud` claim of the authentication JWT must be the " +
                    "authorization server's \"token URL\" (the same URL to which " +
                    "this authentication JWT will be posted)."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : cfg.scope || "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: "test-bad-aud-value",
                            iss: cfg.tokenEndpoint
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if the aud claim is not valid. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-09`,
                name: "Validates authenticationToken.iss",
                description: "The `iss` claim of the authentication JWT must equal the registered `client_id`"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : cfg.scope || "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: "test-iss-value"
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if the iss claim is not valid. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-10`,
                name: "Only accept registered client IDs",
                description: "Verify that clients can't use random client id"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: "test-bad-client-id",
                            sub: "test-bad-client-id"
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if the scope is not set. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-11`,
                name: "Requires scope",
                description: "The server should reject requests to the token endpoint that do not specify a scope"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400, 401 or 403 if the scope is not set. ${getResponseError(response)}`
                ).to.be.within(400, 403);
            });

            it ({
                id  : `Auth-12`,
                name: "Rejects empty scope",
                description: "The server should reject requests to the token endpoint that are requesting an empty scope"
            }, async (cfg, api) => {
                
                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400, 401 or 403 if the scope is empty. ${getResponseError(response)}`
                ).to.be.within(400, 403);
            });

            it ({
                id  : `Auth-13`,
                name: "Validates scopes",
                description: "This test verifies that only valid system scopes are accepted by the server"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "launch fhirUser system/Patient.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    "Response.statusCode must be between 400 and 403 if the scope is not valid. " +
                    "In this case we expect scopes like \"launch\" or \"fhirUser\" to be rejected" +
                    getResponseError(response)
                ).to.be.within(400, 403);
            });

            it ({
                id  : `Auth-14`,
                name: "Supports wildcard action scopes",
                description: "Verifies that scopes like `system/Patient.*` are supported"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "system/Patient.*",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(response.statusCode, getResponseError(response)).to.equal(200);
            });

            it ({
                id  : `Auth-15`,
                name: "Rejects unknown action scopes",
                description: "Verifies that scopes like `system/Patient.unknownAction` are rejected"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "system/Patient.unknownAction",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400, 401 or 403 if the scope is not valid. ${getResponseError(response)}`
                ).to.be.within(400, 403);
            });

            it ({
                id  : `Auth-16`,
                name: "Supports wildcard resource scopes",
                description: "Verifies that scopes like `system/*.read` are supported"
            }, async (cfg, api) => {
                
                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(response.statusCode, getResponseError(response)).to.equal(200);
            });

            it ({
                id  : `Auth-17`,
                name: "Rejects unknown resource scopes",
                description: "Verifies that scopes like `system/UnknownResource.read` are rejected"
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        scope                : "system/UnknownResource.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    "Response.statusCode must be between 400 and 403 if the scope is not valid. " +
                    "In this case we expect scopes like \"system/UnknownResource.read\" to be rejected" +
                    getResponseError(response)
                ).to.be.within(400, 403);
            });

            it ({
                id  : `Auth-18`,
                name: "validates the jku token header",
                description: "When present, the `jky` authentication JWT header should match a value " +
                    "that the client supplied to the FHIR server at client registration time. This test " +
                    "attempts to authorize using `test-bad-jku` as `jky` header value and " +
                    "expects that to produce an error."
            }, async (cfg, api) => {
                
                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: cfg.privateKey,
                    message: "No privateKey configuration found for this server"
                });

                const req = await request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        scope                : cfg.scope || "system/*.read",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {
                            header: {
                                jku: "test-bad-jku"
                            }
                        }, cfg.privateKey)
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    `response.statusCode must be 400 or 401 if the jku is incorrect. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : `Auth-19`,
                name: "Validates the token signature",
                description: "This test attempts to obtain an access token with a " +
                    "request that is completely valid, except that the authentication token " +
                    "is signed with unknown private key."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType && cfg.authType != "none",
                    message: "This test is not applicable for open servers"
                });

                const req = await request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers  : { ...cfg.customHeaders },
                    form: {
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        scope                : cfg.scope || "system/*.read",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: cfg.clientId,
                            sub: cfg.clientId
                        }, {}, {
                            "kty": "EC",
                            "crv": "P-384",
                            "d"  : "cVT-RW48vfIcBku9ccKpm0mU_gPFT8zj6GeVKMSgo2cAZEtutKv_HdmgwL1mJT0q",
                            "x"  : "bqzUWQxnyv-O_lsCLS_ciNlspf4SzmYytx7_SmXNUYlGxfEs6HvfeIE2cofS3pBZ",
                            "y"  : "djY7yFzDoevoxvniLufjbMEBI8tOYjyWH5Spbcm_R8syFIFro89C84Apz_47fAhX",
                            "key_ops": [
                                "sign"
                            ],
                            "ext": true,
                            "kid": "cce12207a49fd90a7db42dc7cb9b8621",
                            "alg": "ES384"
                        })
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the token is not signed " +
                    `with the correct private key. ${getResponseError(response)}`
                ).to.be.within(400, 401);
            });

            it ({
                id  : "Auth-20",
                name: "Authorization using JWKS URL and ES384 keys",
                description: "Verify that the server supports JWKS URL authorization using ES384 keys. This would also prove " +
                    "that JWK keys rotation works because this test will create new key, every time it is executed."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: !cfg.cli,
                    message: "This test cannot be executed in CLI"
                }, {
                    assertion: cfg.jwksUrlAuth && cfg.jwksUrl,
                    message: "This server is not configured to support authorization using JWKS URL"
                }, {
                    assertion: cfg.clientId,
                    message: "No clientId found in configuration"
                });

                const jwks = await createJWKS("ES384");
                const privateKey = jwks.keys.find(k => k.key_ops.indexOf("sign") > -1);
                const publicKey  = jwks.keys.find(k => k.key_ops.indexOf("verify") > -1);

                const token = createClientAssertion({
                    aud: cfg.tokenEndpoint,
                    iss: cfg.clientId,
                    sub: cfg.clientId
                }, {
                    header: {
                        jku: cfg.jwksUrl
                    }
                }, privateKey);

                const authorizationRequest = authenticate(cfg.tokenEndpoint, {
                    client_assertion: token
                });

                // Make a special call to our API that will temporarily override
                // the public key of this server that is hosted at cfg.jwksUrl
                await request({
                    uri : `${cfg.jwksUrl}/override`,
                    json: true,
                    strictSSL: cfg.strictSSL,
                    method: "POST",
                    headers  : { ...cfg.customHeaders },
                    form: {
                        serverId: cfg.id,
                        publicKey: JSON.stringify(publicKey)
                    }
                }).promise();
                
                api.logRequest(authorizationRequest, "Authorization Request");
                const { response } = await authorizationRequest.promise();
                api.logResponse(response, "Authorization Response");

                expectStatusCode(response, 200, "The client should get 200 response code from the authorization request");
                expectJson(response, "The client should get a JSON response from the authorization request");
            });

            it ({
                id  : "Auth-21",
                name: "Authorization using JWKS URL and RS384 keys",
                description: "Verify that the server supports JWKS URL authorization using RS384 keys. This would also prove " +
                    "that JWK keys rotation works because this test will create new key, every time it is executed."
            }, async (cfg, api) => {

                api.prerequisite({
                    assertion: cfg.authType == "backend-services",
                    message: "This test is only applicable for servers that support SMART Backend Services authorization"
                }, {
                    assertion: !cfg.cli,
                    message: "This test cannot be executed in CLI"
                }, {
                    assertion: cfg.jwksUrlAuth && cfg.jwksUrl,
                    message: "This server is not configured to support authorization using JWKS URL"
                }, {
                    assertion: cfg.clientId,
                    message: "No clientId found in configuration"
                });

                const jwks = await createJWKS("RS384");
                const privateKey = jwks.keys.find(k => k.key_ops.indexOf("sign") > -1);
                const publicKey  = jwks.keys.find(k => k.key_ops.indexOf("verify") > -1);

                const token = createClientAssertion({
                    aud: cfg.tokenEndpoint,
                    iss: cfg.clientId,
                    sub: cfg.clientId
                }, {
                    header: {
                        jku: cfg.jwksUrl
                    }
                }, privateKey);

                const authorizationRequest = authenticate(cfg.tokenEndpoint, {
                    client_assertion: token
                });

                // Make a special call to our API that will temporarily override
                // the public key of this server that is hosted at cfg.jwksUrl
                await request({
                    uri : `${cfg.jwksUrl}/override`,
                    json: true,
                    strictSSL: cfg.strictSSL,
                    method: "POST",
                    headers  : { ...cfg.customHeaders },
                    form: {
                        serverId : cfg.id,
                        publicKey: JSON.stringify(publicKey)
                    }
                }).promise();

                api.logRequest(authorizationRequest, "Authorization Request");
                const { response } = await authorizationRequest.promise();
                api.logResponse(response, "Authorization Response");

                expectStatusCode(response, 200, "The client should get 200 response code from the authorization request");
                expectJson(response, "The client should get a JSON response from the authorization request");
            });
        });

    });
};
