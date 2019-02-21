const { expect } = require("code");
const {
    request,
    logRequest,
    logResponse,
    createClientAssertion
} = require("./lib");


const EXPIRED_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZS" +
    "I6InN5c3RlbS8qLioiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6NjAwLC" +
    "JhY2Nlc3NfdG9rZW4iOiIiLCJpYXQiOjE1NDg5MDAwMDB9.R4cr28kxx9V4mzu8sJ5fg7zGq" +
    "I-A5R77v5BhDuN-7jc";

const WRONG_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6" +
    "InN5c3RlbS8qLioiLCJ0b2tlbl90eXBlIjoiYmVhcmVyIiwiZXhwaXJlc19pbiI6NjAwLCJh" +
    "Y2Nlc3NfdG9rZW4iOiIiLCJpYXQiOjE1NDg5MDAwMDB9.er7H4904s8yMlaOmGLPxJzq7Z-i" +
    "fSrDuHccVuijgWr4";


module.exports = function(describe, it) {
    describe("Authorization", () => {
        [
            "/$export",
            "/Patient/$export",
            "/Group/[id]/$export"
        ].forEach(path => {
            describe(`Kick-off request at "${path}"`, () => {
                it ({
                    name: "Requires authorization header",
                    description: "The server should require authorization header"
                }, async (cfg, decorations) => {
                    const req = await request({
                        uri: `${cfg.baseURL}${path}`,
                        json: true,
                        strictSSL: false,
                        headers: {
                            prefer: "respond-async",
                            accept: "application/fhir+json"
                        }
                    });

                    logRequest(decorations, req);
                    const { response } = await req.promise();
                    logResponse(decorations, response);

                    expect(
                        response.statusCode,
                        "response.statusCode must be 401"
                    ).to.equal(401);

                    // expect(
                    //     response.statusMessage,
                    //     "response.statusMessage must be 'Unauthorized'"
                    // ).to.equal("Unauthorized");

                    expect(
                        response.headers["content-type"] || "",
                        "In case of error, the server must reply with JSON " +
                        "content-type header"
                    ).to.match(/^application\/json\b/);

                    expect(
                        response.body,
                        "In case of error, the response body must be an " +
                        "OperationOutcome resource"
                    ).to.contain({ resourceType: "OperationOutcome"});
                });

                it ("Rejects expired token", async (cfg, decorations) => {
                    const req = request({
                        uri: `${cfg.baseURL}${path}`,
                        json: true,
                        strictSSL: false,
                        headers: {
                            prefer: "respond-async",
                            accept: "application/fhir+json",
                            authorization: "Bearer " + EXPIRED_ACCESS_TOKEN
                        }
                    });

                    logRequest(decorations, req);
                    const { response } = await req.promise();
                    logResponse(decorations, response);

                    expect(
                        response.statusCode,
                        "response.statusCode must be 401"
                    ).to.equal(401);

                    // expect(
                    //     response.statusMessage,
                    //     "response.statusMessage must be 'Unauthorized'"
                    // ).to.equal("Unauthorized");

                    expect(
                        response.headers["content-type"] || "",
                        "In case of error, the server must reply with JSON " +
                        "content-type header"
                    ).to.match(/^application\/json\b/);

                    expect(
                        response.body,
                        "In case of error, the response body must be an " +
                        "OperationOutcome resource"
                    ).to.contain({ resourceType: "OperationOutcome"});
                });

                it ("Rejects invalid token", async (cfg, decorations) => {
                    const req = request({
                        uri: `${cfg.baseURL}${path}`,
                        json: true,
                        strictSSL: false,
                        headers: {
                            prefer: "respond-async",
                            accept: "application/fhir+json",
                            authorization: "Bearer " + WRONG_ACCESS_TOKEN
                        }
                    });

                    logRequest(decorations, req);
                    const { response } = await req.promise();
                    logResponse(decorations, response);

                    expect(
                        response.statusCode,
                        "response.statusCode must be 401"
                    ).to.equal(401);

                    // expect(
                    //     response.statusMessage,
                    //     "response.statusMessage must be 'Unauthorized'"
                    // ).to.equal("Unauthorized");

                    expect(
                        response.headers["content-type"] || "",
                        "In case of error, the server must reply with JSON " +
                        "content-type header"
                    ).to.match(/^application\/json\b/);

                    expect(
                        response.body,
                        "In case of error, the response body must be an " +
                        "OperationOutcome resource"
                    ).to.contain({ resourceType: "OperationOutcome"});
                });
            });
        });

        describe("Token endpoint", () => {
            it ({
                name: 'Requires "application/x-www-form-urlencoded" POSTs',
                description: "After generating an authentication JWT, the client " +
                    "requests a new access token via HTTP POST to the FHIR " + 
                    "authorization server's token endpoint URL, using content-type " +
                    "<code>application/x-www-form-urlencoded</code>."
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    headers: {
                        "Content-type": "application/json"
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);


                expect(
                    response.statusCode,
                    "response.statusCode must be >=400 if another content-type " +
                    "request header is sent"
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
                name: "The 'grant_type' parameter must be present",
                description: "The server should reply with 400 Bad Request if the " +
                    "grant_type parameter is not sent by the client."
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form     : {
                        scope                : "system/*.read",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if grant_type is not sent"
                ).to.be.within(400, 401);
            });

            it ({
                name: 'The "grant_type" must equal "client_credentials"',
                description: "The server should reply with 400 Bad Request if the " +
                    "grant_type parameter is not <code>client_credentials</code>."
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form     : {
                        scope                : "system/*.read",
                        grant_type           : "test-grant_type-value",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if grant_type is not sent"
                ).to.be.within(400, 401);
            });

            it ({
                name: 'The "client_assertion_type" must be present',
                description: "The server should reply with 400 Bad Request if the " +
                    "client_assertion_type parameter is not sent by the client."
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form: {
                        scope           : "system/*.read",
                        grant_type      : "client_credentials",
                        client_assertion: createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if grant_type is not sent"
                ).to.be.within(400, 401);
            });

            it ({
                name: 'The "client_assertion_type" must be jwt-bearer',
                description: "The server should reply with 400 Bad Request if the " +
                    "client_assertion_type parameter is not equal to <code>" +
                    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer</code>"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form: {
                        scope                : "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "test-client_assertion_type-value",
                        client_assertion     : createClientAssertion({}, {}, cfg.privateKey)
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if client_assertion_type " +
                    "is not valid"
                ).to.be.within(400, 401);
            });

            it ({
                name: "The client_assertion parameter must be a token",
                description: "This test verifies that if the client sends something " +
                    "other then a JWT, the server will detect it and reject the request."
            }, async (cfg, decorations) => {
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the client_assertion is not a valid JWT"
                ).to.be.within(400, 401);

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                name: "Validates authenticationToken.aud",
                description: `The <code>aud</code> claim of the authentication JWT must be the ` +
                    `authorization server's "token URL" (the same URL to which this authentication JWT will be posted)`
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form: {
                        scope                : "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: "test-bad-aud-value",
                            iss: cfg.tokenEndpoint
                        }, {}, cfg.privateKey)
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the aud claim is not valid"
                ).to.be.within(400, 401);
            });

            it ({
                name: "Validates authenticationToken.iss",
                description: "The <code>iss</code> claim of the authentication JWT must equal the registered <code>client_id</code>"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form: {
                        scope                : "system/*.read",
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        client_assertion     : createClientAssertion({
                            aud: cfg.tokenEndpoint,
                            iss: "test-iss-value"
                        }, {}, cfg.privateKey)
                    }
                });

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the iss claim is not valid"
                ).to.be.within(400, 401);

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_grant OAuth error"
                // ).to.contain({
                //     error: "invalid_grant"
                // });
            });

            it ({
                name: "Only accept registered client IDs",
                description: "Verify that clients can't use random client id"
            }, async (cfg, decorations) => {
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the scope is not set"
                ).to.be.within(400, 401);
            });

            it ({
                name: "Requires scope",
                description: ""
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400, 401 or 403 if the scope is not set"
                ).to.be.within(400, 403);
            });

            it ({
                name: "Rejects empty scope",
                description: ""
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400, 401 or 403 if the scope is empty"
                ).to.be.within(400, 403);
            });

            it ({
                name: "Validates scopes",
                description: "This test verifies that only valid system scopes are accepted by the server"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400, 401 or 403 if the scope is not valid"
                ).to.be.within(400, 403);

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                name: "Supports wildcard action scopes",
                description: "Verifies that scopes like <code>system/Patient.*</code> are supported"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(response.statusCode).to.equal(200);
            });

            it ({
                name: "Rejects unknown action scopes",
                description: "Verifies that scopes like <code>system/Patient.unknownAction</code> are rejected"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400, 401 or 403 if the scope is not valid"
                ).to.be.within(400, 403);

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                name: "Supports wildcard resource scopes",
                description: "Verifies that scopes like <code>system/*.read</code> are supported"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(response.statusCode).to.equal(200);
            });

            it ({
                name: "Rejects unknown resource scopes",
                description: "Verifies that scopes like <code>system/UnknownResource.read</code> are rejected"
            }, async (cfg, decorations) => {
                const req = request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400, 401 or 403 if the scope is not valid"
                ).to.be.within(400, 403);

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_scope OAuth error"
                // ).to.contain({
                //     error: "invalid_scope"
                // });
            });

            it ({
                name: "validates the jku token header",
                description: ""
            }, async (cfg, decorations) => {
                const req = await request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form: {
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        scope                : "system/*.read",
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the jku is incorrect"
                ).to.be.within(400, 401);
            });

            it ({
                name: "Validates the token signature",
                description: "This test attempts to obtain an access token with a " +
                    "request that is completely valid, except that the authentication token " +
                    "is signed with unknown private key."
            }, async (cfg, decorations) => {
                const req = await request({
                    method   : "POST",
                    uri      : cfg.tokenEndpoint,
                    json     : true,
                    strictSSL: false,
                    form: {
                        grant_type           : "client_credentials",
                        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                        scope                : "system/*.read",
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

                logRequest(decorations, req);
                const { response } = await req.promise();
                logResponse(decorations, response);

                expect(
                    response.statusCode,
                    "response.statusCode must be 400 or 401 if the token is not signed " +
                    "with the correct private key"
                ).to.be.within(400, 401);

                // expect(
                //     response.body,
                //     "The server SHALL respond with an invalid_request OAuth error"
                // ).to.contain({
                //     error: "invalid_request"
                // });
            });
        });
    });
};
