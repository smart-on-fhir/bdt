"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bdt_1 = require("../lib/bdt");
const BulkDataClient_1 = require("../lib/BulkDataClient");
const node_jose_1 = __importDefault(require("node-jose"));
const assertions_1 = require("../lib/assertions");
bdt_1.suite("Authorization", () => {
    // A few tests that are the same for each of the kick-off endpoints
    ["system", "patient", "group"].forEach((type) => {
        bdt_1.suite(`Kick-off request at the ${type}-level export endpoint`, () => {
            bdt_1.test({
                name: `Requires authorization header`,
                description: `The server should require authorization header at the ${type}-level export endpoint`
            }, async ({ config, api }) => {
                api.prerequisite({
                    assertion: config.authentication.type !== "none",
                    message: "This server does not support authorization"
                }, {
                    assertion: !config.authentication.optional,
                    message: "Authorization is optional for this server"
                });
                const client = new BulkDataClient_1.BulkDataClient(config, api);
                const { response } = await client.kickOff({ type, skipAuth: true });
                await client.cancelIfStarted(response);
                assertions_1.expectUnauthorized(client.kickOffResponse, "The server must not accept kick-off requests without authorization header");
                assertions_1.expectJsonResponse(client.kickOffResponse, "The response body SHALL be a FHIR OperationOutcome resource in JSON format.");
            });
            bdt_1.test({
                name: `Rejects invalid token`,
                description: `The server should reject invalid tokens at the ${type}-level export endpoint`,
            }, async ({ config, api }) => {
                api.prerequisite({
                    assertion: config.authentication.type !== "none",
                    message: "This server does not support authorization"
                });
                const client = new BulkDataClient_1.BulkDataClient(config, api);
                const { response } = await client.kickOff({ type, skipAuth: true, headers: { authorization: "Bearer invalidToken" } });
                client.cancelIfStarted(response);
                assertions_1.expectUnauthorized(client.kickOffResponse, "The server must not accept kick-off requests with invalid token in the authorization header.");
                assertions_1.expectOperationOutcome(client.kickOffResponse, "The response body SHALL be a FHIR OperationOutcome resource in JSON format");
            });
        });
    });
    bdt_1.suite("Token endpoint", () => {
        bdt_1.beforeEach(({ config, api, context }) => {
            api.prerequisite({
                assertion: config.authentication.type === "backend-services",
                message: "This test is only applicable for servers that support SMART Backend Services authorization."
            }, {
                assertion: config.authentication.privateKey,
                message: "No privateKey configuration found for this server."
            }, {
                assertion: config.authentication.tokenEndpoint,
                message: "No tokenEndpoint configuration found for this server."
            }, {
                assertion: config.authentication.clientId,
                message: "No clientId found in configuration"
            });
            const client = context.client = new BulkDataClient_1.BulkDataClient(config, api);
            context.form = {
                grant_type: "client_credentials",
                client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                scope: config.authentication.scope,
                client_assertion: client.createAuthenticationToken({
                    claims: config.authentication.customTokenHeaders,
                    // algorithm: config.authentication.tokenSignAlgorithm,
                    header: {
                        ...config.authentication.customTokenHeaders
                    }
                })
            };
        });
        // ====================================================================
        bdt_1.test({
            name: "Clients can authorize",
            description: "Does not test any edge cases. Just verifies that the " +
                "authorization works with the provided settings"
        }, async ({ config, context, api }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: context.form
            });
            assertions_1.expectSuccessfulAuth(response, "Authorization failed");
        });
        bdt_1.test({
            name: 'Requires "application/x-www-form-urlencoded" POSTs',
            description: "After generating an authentication JWT, the client " +
                "requests a new access token via HTTP POST to the FHIR " +
                "authorization server's token endpoint URL, using content-type " +
                "`application/x-www-form-urlencoded`."
        }, async ({ config, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                headers: {
                    "content-type": "application/json"
                }
            });
            assertions_1.expectOAuthError(response, 'Authorization should fail if a content-type header other than "application/x-www-form-urlencoded" is sent');
        });
        [
            "grant_type",
            "client_assertion_type",
            "scope",
            "client_assertion"
        ].forEach(param => {
            bdt_1.test({
                name: `The '${param}' parameter must be present`,
                description: "The server should reply with 400 Bad Request if the " +
                    `\`${param}\` parameter is not sent by the client.`
            }, async ({ config, context }) => {
                const { response } = await context.client.request({
                    method: "POST",
                    url: config.authentication.tokenEndpoint,
                    form: {
                        ...context.form,
                        [param]: undefined
                    }
                });
                assertions_1.expectOAuthError(response, `Authorization should fail if the "${param}" parameter is omitted from the POST body`);
            });
            bdt_1.test({
                name: `The '${param}' parameter must be valid`,
                description: "The server should reply with 400 Bad Request if the " +
                    `\`${param}\` parameter has invalid value.`
            }, async ({ config, context }) => {
                const { response } = await context.client.request({
                    method: "POST",
                    url: config.authentication.tokenEndpoint,
                    form: {
                        ...context.form,
                        [param]: "invalid test value"
                    }
                });
                assertions_1.expectOAuthError(response, `Authorization should fail if the "${param}" parameter of the POST body is invalid`);
            });
        });
        bdt_1.test({
            name: "Validates authenticationToken.aud",
            description: "The `aud` claim of the authentication JWT must be the " +
                "authorization server's \"token URL\" (the same URL to which " +
                "this authentication JWT will be posted)."
        }, async ({ context, config }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    client_assertion: context.client.createAuthenticationToken({
                        claims: {
                            aud: "test-bad-aud-value"
                        }
                    })
                }
            });
            assertions_1.expectOAuthError(response, `Authorization should fail if the "aud" claim of the authentication token is invalid`);
        });
        bdt_1.test({
            name: "Validates authenticationToken.iss",
            description: "The `iss` claim of the authentication JWT must equal the registered `client_id`"
        }, async ({ config, api, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    client_assertion: context.client.createAuthenticationToken({
                        claims: {
                            iss: "test-iss-value"
                        }
                    })
                }
            });
            assertions_1.expectOAuthError(response, `Authorization should fail if the "iss" claim of the authentication token is invalid`);
        });
        bdt_1.test({
            name: "Only accept registered client IDs",
            description: "Verify that clients can't use random client id"
        }, async ({ config, api, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    client_assertion: context.client.createAuthenticationToken({
                        claims: {
                            iss: "test-bad-client-id",
                            sub: "test-bad-client-id"
                        }
                    })
                }
            });
            assertions_1.expectOAuthError(response, `Authorization should fail if the "iss" or "sub" claims of the authentication token ` +
                `do not equal the client's client_id`);
        });
        // Scopes -------------------------------------------------------------
        bdt_1.test({
            name: "Rejects empty scope",
            description: "The server should reject requests to the token endpoint that are requesting an empty scope"
        }, async ({ config, api, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    scope: ""
                }
            });
            assertions_1.expectOAuthErrorType(response, "invalid_scope", 'The authorization attempt should fail if an empty ("") scope is requested');
        });
        bdt_1.test({
            name: "Validates scopes",
            description: "This test verifies that only valid system scopes are accepted by the server"
        }, async ({ config, api, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    scope: "launch fhirUser"
                }
            });
            assertions_1.expectOAuthErrorType(response, "invalid_scope", "The authorization attempt must fail if a non-system scope is requested");
        });
        bdt_1.test({
            name: "Handles wildcard action scopes correctly",
            description: "Verifies that scopes like `system/Patient.*` or `system/*.*` are handled correctly. Examples:\n" +
                "- If `system/*.*` is requested, the server should grant `system/*.read` or `system/*.*`\n" +
                "- If `system/Patient.*` is requested, the server should grant `system/Patient.read`, `system/Patient.*`, `system/*.read` or `system/*.*`\n" +
                "- Servers should avoid granting `.*` action scopes and prefer `.read` instead\n" +
                "- Servers should NOT explicitly grant any `.write` scopes\n"
        }, async ({ config, context, api }) => {
            const scopes = [
                "system/*.*",
                "system/*.read",
                "system/Patient.*",
                "system/Patient.read",
                "system/Patient.write"
            ];
            for (const scope of scopes) {
                const { response } = await context.client.request({
                    method: "POST",
                    url: config.authentication.tokenEndpoint,
                    form: { ...context.form, scope }
                });
                if (response.statusCode === 200) {
                    assertions_1.expectSuccessfulAuth(response, `If the server supports the "${scope}" scope, then it must reply with valid token response`);
                }
                else {
                    assertions_1.expectOAuthErrorType(response, "invalid_scope", `It appears that the "${scope}" scope is not supported by the server.` +
                        `In this case we expect a proper OAuth error response from the token ` +
                        `endpoint.`);
                }
            }
        });
        bdt_1.test({
            name: "Accepts wildcard resource scopes",
            description: "Verifies that scopes like `system/*.read` are supported."
        }, async ({ config, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    scope: "system/*.read"
                }
            });
            assertions_1.expectSuccessfulAuth(response, 'The authorization attempt should be successful with a "system/*.read" scope');
        });
        bdt_1.test({
            name: "Rejects unknown action scopes",
            description: "Verifies that scopes like `system/Patient.unknownAction` are rejected"
        }, async ({ config, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    scope: "system/Patient.unknownAction"
                }
            });
            assertions_1.expectOAuthErrorType(response, "invalid_scope", "The authorization attempt must fail if a scope is requesting an unknown action (other than read, write or *)");
        });
        bdt_1.test({
            name: "Rejects unknown resource scopes",
            description: "Verifies that scopes like `system/UnknownResource.read` are rejected"
        }, async ({ config, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    scope: "system/UnknownResource.read"
                }
            });
            assertions_1.expectOAuthErrorType(response, "invalid_scope", "The authorization attempt must fail if requested scopes are pointing to unknown FHIR resources");
        });
        bdt_1.test({
            name: "validates the jku token header",
            description: "When present, the `jku` authentication JWT header should match a value " +
                "that the client supplied to the FHIR server at client registration time. This test " +
                "attempts to authorize using `test-bad-jku` as `jku` header value and " +
                "expects that to produce an error."
        }, async ({ config, context, api }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    client_assertion: context.client.createAuthenticationToken({
                        header: {
                            jku: "test-bad-jku"
                        }
                    })
                }
            });
            assertions_1.expectOAuthError(response, "The authorization attempt must fail if a bad jku token header is passed");
        });
        bdt_1.test({
            name: "Validates the token signature",
            description: "This test attempts to obtain an access token with a " +
                "request that is completely valid, except that the authentication token " +
                "is then signed with unknown private key."
        }, async ({ config, context }) => {
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    client_assertion: context.client.createAuthenticationToken({
                        privateKey: await node_jose_1.default.JWK.asKey({
                            "kty": "EC",
                            "crv": "P-384",
                            "d": "bZ6nG0i5_kWYzDMIk71uy6h2zAmBibRDOT2znMEZX7e7O78o9mdhH_vA-asrkJ6Y",
                            "x": "PcX0uwRA4nRIVFM4fALP_oAz0Ls5qlmMk8GsZzZhtcKZDWyMvLR_dzpeLubiOpk7",
                            "y": "IdWUfm65Gy-uRFIQLRPp9nmm6VD-zLoTsrsBgDpvyR3C-uJuVHGske4Qw-1rqzKs",
                            "key_ops": ["sign"],
                            "ext": true,
                            "kid": "c9d9648128e768998657cdf98a61e92f",
                            "alg": "ES384"
                        })
                    })
                }
            });
            assertions_1.expectOAuthError(response, "The authorization attempt must fail if the token is not signed with the correct private key");
        });
        bdt_1.test({
            name: "Authorization using JWKS URL",
            description: "Verify that the server supports JWKS URL authorization. This would also verify " +
                "that JWK key rotation is possible, because this test will create new key, every time it " +
                "is executed."
        }, async ({ config, context, api }) => {
            api.prerequisite({
                assertion: config.authentication.jwksUrl,
                message: "This server is not configured to support authorization using JWKS URL"
            });
            const { response } = await context.client.request({
                method: "POST",
                url: config.authentication.tokenEndpoint,
                form: {
                    ...context.form,
                    client_assertion: context.client.createAuthenticationToken({
                        header: {
                            ...config.authentication.customTokenHeaders,
                            jku: config.authentication.jwksUrl
                        }
                    })
                }
            });
            assertions_1.expectSuccessfulAuth(response, "Failed to authorize via JWKS URL");
        });
    });
});
//# sourceMappingURL=authorization.test.js.map