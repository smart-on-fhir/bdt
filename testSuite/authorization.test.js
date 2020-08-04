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
    getResponseError
} = require("./lib");


// {
//     "alg": "HS256",
//     "typ": "JWT"
// }
// {
//   "scope": "system/*.*",
//   "token_type": "bearer",
//   "expires_in": 600,
//   "access_token": "",
//   "iat": 1548900000 // Wed Jan 30 2019 21:00:00 GMT-0500 (Eastern Standard Time)
// }
const EXPIRED_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZS" +
    "I6InN5c3RlbS8qLioiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6NjAwLC" +
    "JhY2Nlc3NfdG9rZW4iOiIiLCJpYXQiOjE1NDg5MDAwMDB9.R4cr28kxx9V4mzu8sJ5fg7zGq" +
    "I-A5R77v5BhDuN-7jc";

// {
//   "alg": "HS256",
//   "typ": "JWT"
// }
// {
//   "scope": "system/*.*",
//   "token_type": "bearer",
//   "expires_in": 600,
//   "access_token": "",
//   "iat": 1548900000 // Wed Jan 30 2019 21:00:00 GMT-0500 (Eastern Standard Time)
// }
const WRONG_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6" +
    "InN5c3RlbS8qLioiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6NjAwLCJh" +
    "Y2Nlc3NfdG9rZW4iOiIiLCJpYXQiOjE1NDg5MDAwMDB9.er7H4904s8yMlaOmGLPxJzq7Z-i" +
    "fSrDuHccVuijgWr4";
    
    // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InN5c3RlbS8qLioiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6NjAwLCJhY2Nlc3NfdG9rZW4iOiIiLCJpYXQiOjE1NDg5MDAwMDB9.R4cr28kxx9V4mzu8sJ5fg7zGqI-A5R77v5BhDuN-7jc"
    // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6InN5c3RlbS8qLioiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6NjAwLCJhY2Nlc3NfdG9rZW4iOiIiLCJpYXQiOjE1NDg5MDAwMDB9.R4cr28kxx9V4mzu8sJ5fg7zGqI-A5R77v5BhDuN-7jc"

module.exports = function(describe, it) {
    describe("Authorization", () => {
        
        // A few tests that are the same for each of the kick-off endpoints
        [
            { prop: "systemExportEndpoint" , name: "system-level export" },
            { prop: "patientExportEndpoint", name: "patient-level export" },
            { prop: "groupExportEndpoint"  , name: "group-level export" }
        ].forEach(({ prop, name }, i) => {
            describe(`Kick-off request at the ${name} endpoint`, () => {
                it ({
                    id  : `Auth-01.${i}.0`,
                    name: `Requires authorization header`,
                    description: `The server should require authorization header at the ${name} endpoint`
                }, async function(cfg, api) {

                    if (cfg.authType == "none") {
                        return api.setNotSupported(`This server does not support authorization`);
                    }

                    if (!cfg[prop]) {
                        return api.setNotSupported(`The ${name} is not supported by this server`);
                    }

                    if (!cfg.requiresAuth) {
                        return api.setNotSupported(`This server does not require authorization`);
                    }

                    const req = await request({
                        uri: `${cfg.baseURL}${cfg[prop]}`,
                        json: true,
                        strictSSL: cfg.strictSSL,
                        headers: {
                            prefer: "respond-async",
                            accept: "application/fhir+json"
                        }
                    });

                    api.logRequest(req);
                    const { response } = await req.promise();
                    api.logResponse(response);

                    if (cfg.requiresAuth) {
                        expectUnauthorized(response);
                        try {
                            expectJson(response);
                        } catch (ex) {
                            api.warn("The server does not respond with JSON regardless of the accept header! " + ex);
                        }
                        expectOperationOutcome(response, "In case of error, the response body must be an OperationOutcome");
                    } else {
                        api.decorateHTML(
                            "NOTE",
                            "<b>NOTE: </b> Authorization is not required by this server. These tests were skipped!"
                        );
                    }
                });

                it ({
                    id  : `Auth-01.${i}.1`,
                    name: `Rejects expired token`,
                    description: `The server should reject expired tokens at the ${name} endpoint`
                }, async function(cfg, api) {
                    
                    if (!cfg[prop]) {
                        return api.setNotSupported(`The ${name} is not supported by this server`);
                    }

                    if (!cfg.requiresAuth) {
                        return api.setNotSupported(`This server does not require authorization`);
                    }

                    const tokenRequest = await request({
                        method   : "POST",
                        uri      : cfg.tokenEndpoint,
                        json     : true,
                        strictSSL: cfg.strictSSL,
                        form: {
                            grant_type           : "client_credentials",
                            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                            scope                : cfg.scope || "system/*.read",
                            client_assertion     : createClientAssertion({
                                aud: cfg.tokenEndpoint,
                                iss: cfg.clientId,
                                sub: cfg.clientId
                            }, {}, cfg.privateKey)
                        }
                    });


                    const { response: tokenResponse } = await tokenRequest.promise()
                    console.log(tokenResponse.body)

                    const expiredToken = createClientAssertion({
                        exp: Math.floor(Date.now() / 1000) - 300, // 5 min ago
                        // aud: cfg.tokenEndpoint,
                        // iss: cfg.clientId,
                        // sub: cfg.clientId
                    }, {}, 
                        // cfg.privateKey
                        {
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
                    });

                    console.log(expiredToken);

                    const req = request({
                        uri: `${cfg.baseURL}${cfg[prop]}`,
                        json: true,
                        strictSSL: cfg.strictSSL,
                        headers: {
                            prefer: "respond-async",
                            accept: "application/fhir+json",
                            // authorization: "Bearer " + EXPIRED_ACCESS_TOKEN,
                            authorization: "Bearer " + expiredToken
                        }
                    });

                    api.logRequest(req);
                    const { response } = await req.promise();
                    console.log(JSON.stringify(response.body, null, 4));
                    api.logResponse(response);
                    expectUnauthorized(response);
                    try {
                        expectJson(response);
                    } catch (ex) {
                        api.warn("The server does not respond with JSON regardless of the accept header!");
                    }
                    expectOperationOutcome(response, "In case of error, the response body must be an OperationOutcome");
                });

                it ({
                    id  : `Auth-01.${i}.2`,
                    name: `Rejects invalid token`,
                    description: `The server should reject invalid tokens at the ${name} endpoint`
                }, async function(cfg, api) {
                    if (!cfg[prop]) {
                        return api.setNotSupported(`The ${name} is not supported by this server`);
                    }

                    if (!cfg.requiresAuth) {
                        return api.setNotSupported(`This server does not require authorization`);
                    }
                    
                    const req = request({
                        uri: `${cfg.baseURL}${cfg[prop]}`,
                        json: true,
                        strictSSL: cfg.strictSSL,
                        headers: {
                            prefer: "respond-async",
                            accept: "application/fhir+json",
                            authorization: "Bearer " + WRONG_ACCESS_TOKEN
                        }
                    });

                    api.logRequest(req);
                    const { response } = await req.promise();
                    api.logResponse(response);
                    expectUnauthorized(response);
                    try {
                        expectJson(response);
                    } catch (ex) {
                        api.warn("The server does not respond with JSON regardless of the accept header!");
                    }
                    expectOperationOutcome(response, "In case of error, the response body must be an OperationOutcome");
                });
            });
        });

        describe("Token endpoint", () => {


            it ({
                id  : `Auth-02`,
                name: 'Requires "application/x-www-form-urlencoded" POSTs',
                description: "After generating an authentication JWT, the client " +
                    "requests a new access token via HTTP POST to the FHIR " + 
                    "authorization server's token endpoint URL, using content-type " +
                    "`application/x-www-form-urlencoded`."
            }, async (cfg, api) => {

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
                    headers: {
                        "Content-type": "application/json"
                    }
                });

                api.logRequest(req);
                const { response } = await req.promise();
                api.logResponse(response);


                expect(
                    response.statusCode,
                    "response.statusCode must be >=400 if another content-type " +
                    `request header is sent. ${getResponseError(response)}`
                ).to.be.above(399);

                // If an error is encountered during the authentication process,
                // the server SHALL respond with an invalid_client error as
                // defined by the OAuth 2.0 specification.
                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_request OAuth error"
                // ).to.contain({
                //     error: "invalid_request"
                // });
            });

            it ({
                id  : `Auth-03`,
                name: "The 'grant_type' parameter must be present",
                description: "The server should reply with 400 Bad Request if the " +
                    "`grant_type parameter` is not sent by the client."
            }, async (cfg, api) => {

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    strictSSL: cfg.strictSSL,
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

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                id  : `Auth-08`,
                name: "Validates authenticationToken.aud",
                description: "The `aud` claim of the authentication JWT must be the " +
                    "authorization server's \"token URL\" (the same URL to which " +
                    "this authentication JWT will be posted)."
            }, async (cfg, api) => {
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_grant OAuth error"
                // ).to.contain({
                //     error: "invalid_grant"
                // });
            });

            it ({
                id  : `Auth-10`,
                name: "Only accept registered client IDs",
                description: "Verify that clients can't use random client id"
            }, async (cfg, api) => {
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }
                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                id  : `Auth-14`,
                name: "Supports wildcard action scopes",
                description: "Verifies that scopes like `system/Patient.*` are supported"
            }, async (cfg, api) => {
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }
                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }
                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                id  : `Auth-16`,
                name: "Supports wildcard resource scopes",
                description: "Verifies that scopes like `system/*.read` are supported"
            }, async (cfg, api) => {
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }
                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType == "client-credentials") {
                    return api.setNotSupported(
                        `This test is not not applicable for servers using client-credentials authentication`
                    );
                }
                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                id  : `Auth-18`,
                name: "validates the jku token header",
                description: "When present, the `jky` authentication JWT header should match a value " +
                    "that the client supplied to the FHIR server at client registration time. This test " +
                    "attempts to authorize using `test-bad-jku` as `jky` header value and " +
                    "expects that to produce an error."
            }, async (cfg, api) => {
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }
                if (!cfg.privateKey) {
                    return api.setNotSupported(`No privateKey configuration found for this server`);
                }
                const req = await request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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
                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }
                const req = await request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: cfg.strictSSL,
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

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_request OAuth error"
                // ).to.contain({
                //     error: "invalid_request"
                // });
            });

            it ({
                id  : "Auth-20",
                name: "Authorization using JWKS URL and ES384 keys",
                description: "Verify that the server supports JWKS URL authorization using ES384 keys. This would also prove " +
                    "that JWK keys rotation works because this test will create new key, every time it is executed."
            }, async (cfg, api) => {

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (cfg.cli) {
                    return api.setNotSupported(`This test cannot be executed in CLI`);
                }

                if (!cfg.jwksUrlAuth || !cfg.jwksUrl) {
                    return api.setNotSupported(`This server is not configured to support authorization using JWKS URL`);
                }

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

                if (cfg.authType != "backend-services") {
                    return api.setNotSupported(`This test is only applicable for servers that support SMART Backend Services authorization`);
                }

                if (cfg.cli) {
                    return api.setNotSupported(`This test cannot be executed in CLI`);
                }

                if (!cfg.jwksUrlAuth || !cfg.jwksUrl) {
                    return api.setNotSupported(`This server is not configured to support authorization using JWKS URL`);
                }

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
