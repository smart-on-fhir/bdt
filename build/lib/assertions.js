"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = exports.expectValidManifestEntry = exports.expectNDJSONElements = exports.expectExportNotEmpty = exports.expectSuccessfulDownload = exports.expectSuccessfulExport = exports.expectSuccessfulKickOff = exports.expectFailedKickOff = exports.expectSuccessfulAuth = exports.expectOAuthErrorType = exports.expectOAuthError = exports.expectUnauthorized = exports.expectOperationOutcome = exports.expectFhirResourceType = exports.expectFhirResource = exports.expectNDJsonResponse = exports.expectJsonResponse = exports.expectClientError = exports.expectResponseText = exports.expectResponseCode = exports.concat = void 0;
const code_1 = require("@hapi/code");
const lib_1 = require("./lib");
const moment_1 = __importDefault(require("moment"));
const REGEXP_INSTANT = new RegExp("([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-" +
    "(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3])" +
    ":[0-5][0-9]:([0-5][0-9]|60)(\\.[0-9]+)?(Z|(\\+|-)((0[0-9]|1[0-3])" +
    ":[0-5][0-9]|14:00))");
function concat(...messages) {
    // for (let i = 0; i < messages.length; i++) {
    //     let m = String(messages[i]).trim().replace(/^\n\-\s/, "").replace(/[\s\.]*$/, "");
    //     let a = m.split("\n✖ ").map(x => x.replace(/^(Assertion|- )/, ""));
    //     messages[i] = a.shift()
    //     while (a.length) {
    //         messages.splice(i + 1, 0, a.shift())
    //     }
    // }
    // return "\n✖ " + messages.filter(Boolean).join("\n✖ ") + "\n✖ Assertion";
    return "\n✖ " + messages.map(x => String(x).replace(/\n✖\sAssertion$/, "").replace(/^\n✖\s*/, "").trim()).filter(Boolean).join("\n✖ ") + "\n✖ Assertion";
}
exports.concat = concat;
/**
 * Asserts that the `statusCode` of the given response is either:
 * 1. Equal to the given `code` argument, if that code is a number
 * 2. Listed in the given `code` argument, if that code is an array of numbers
 * @category Response Assertion
 */
function expectResponseCode(response, code, prefix = "") {
    if (Array.isArray(code)) {
        code_1.expect(code, concat(prefix, `Unexpected status code`)).to.include(response.statusCode);
    }
    else {
        code_1.expect(response.statusCode, concat(prefix, `Unexpected status code`)).to.equal(code);
    }
}
exports.expectResponseCode = expectResponseCode;
/**
 * Asserts that the `statusMessage` of the given response is either:
 * 1. Equal to the given `text` argument, if that text is a string
 * 2. Listed in the given `text` argument, if that text is an array of strings
 * @category Response Assertion
 */
function expectResponseText(response, text, prefix = "") {
    code_1.expect(response.statusMessage, concat(prefix, `The response has no status text`)).to.exist();
    const texts = Array.isArray(text) ? text : [text];
    code_1.expect(texts, concat(prefix, `Unexpected status text`)).to.include(response.statusMessage);
}
exports.expectResponseText = expectResponseText;
/**
 * Asserts that the `statusCode` of the given response is either
 * between `400` and `499`
 * @category Response Assertion
 */
function expectClientError(response, prefix = "") {
    code_1.expect(response.statusCode, concat(prefix, `Expected client error (4XX status code). Got ${response.statusCode}`)).to.be.within(400, 499);
}
exports.expectClientError = expectClientError;
/**
 * @category Response Assertion
 */
function expectJsonResponse(response, prefix = "") {
    const contentType = String(response.headers?.["content-type"] || "");
    const contentTypePrefix = contentType.toLowerCase().split(";").shift();
    const jsonTypes = [
        "application/json",
        "application/json+fhir",
        "application/fhir+json"
    ];
    code_1.expect(jsonTypes, concat(prefix, `The server must reply with JSON content-type header (${jsonTypes.join(" | ")})`, `Got "${contentType}"`, lib_1.getErrorMessageFromResponse(response))).to.include(contentTypePrefix);
    // if (typeof response.body == "string") {
    //     try {    
    //         JSON.parse(response.body);
    //     } catch (ex) {
    //         throw new Error(concat(
    //             prefix,
    //             "The response body cannot be parsed as JSON.",
    //             "Error parsing JSON: " + ex.messagePrefix
    //         ));
    //     }
    // } else {
    code_1.expect(response.body, concat(prefix, "The response body is undefined")).not.to.be.undefined();
    code_1.expect(response.body, concat(prefix, "The response body is null")).not.to.be.null();
    code_1.expect(response.body, concat(prefix, "The response body is not an object")).to.be.object();
    // }
}
exports.expectJsonResponse = expectJsonResponse;
/**
 * @category Response Assertion
 */
function expectNDJsonResponse(response, prefix = "") {
    const contentType = String(response.headers["content-type"] || "");
    code_1.expect(contentType, concat(prefix, `The server must reply with FHIR NDJSON content-type header. Got "${contentType}"`, lib_1.getErrorMessageFromResponse(response))).to.startWith("application/fhir+ndjson");
    code_1.expect(response.body, concat(prefix, "The response body is not a string")).to.be.string();
    code_1.expect(response.body, concat(prefix, "The response body is empty")).to.not.be.empty();
    const lines = (response.body + "").split(/\n/);
    let i = 0;
    for (const line of lines) {
        i++;
        if (!line.trim()) {
            continue;
        }
        try {
            const obj = JSON.parse(line);
            if (!obj || typeof obj !== "object") {
                throw new Error("line is not a JSON object");
            }
        }
        catch (err) {
            err.message = concat(prefix, `Error parsing NDJSON at line ${i}: ${err.message}`);
            throw err;
        }
    }
}
exports.expectNDJsonResponse = expectNDJsonResponse;
/**
 * @category Response Assertion
 */
function expectFhirResource(response, prefix = "") {
    expectJsonResponse(response, prefix);
    code_1.expect(response.body, concat(prefix, 'The response body has no "resourceType"')).to.include("resourceType");
}
exports.expectFhirResource = expectFhirResource;
/**
 * @category Response Assertion
 */
function expectFhirResourceType(response, resourceType, prefix = "") {
    expectFhirResource(response, prefix);
    code_1.expect(response.body.resourceType, concat(prefix, "Unexpected resourceType")).to.equal(resourceType);
}
exports.expectFhirResourceType = expectFhirResourceType;
/**
 * @category Response Assertion
 */
function expectOperationOutcome(response, prefix = "") {
    expectFhirResourceType(response, "OperationOutcome", prefix);
}
exports.expectOperationOutcome = expectOperationOutcome;
/**
 * @category Response Assertion
 */
function expectUnauthorized(response, prefix = "") {
    const acceptable = {
        401: "Unauthorized",
        406: "Not Acceptable"
    };
    expectResponseCode(response, Object.keys(acceptable).map(Number), prefix);
    // Some servers return empty statusMessage
    // TODO: Decide if we need to do this. Is 401 ok with custom status text?
    if (response.statusMessage) {
        expectResponseText(response, Object.values(acceptable), prefix);
    }
}
exports.expectUnauthorized = expectUnauthorized;
/**
 * @category Response Assertion
 */
function expectOAuthError(response, prefix = "") {
    expectJsonResponse(response, prefix);
    expectClientError(response, prefix);
    const body = response.body;
    const validErrorTypes = [
        "invalid_request",
        "invalid_client",
        "invalid_grant",
        "unauthorized_client",
        "unsupported_grant_type",
        "invalid_scope"
    ];
    const { error, error_description, error_uri } = body;
    const err = "Got " + lib_1.getErrorMessageFromResponse(response);
    // body.error
    code_1.expect(error, concat(prefix, err, "The 'error' property of OAuth error responses is required")).to.exist();
    code_1.expect(error, concat(prefix, err, "The 'error' property of OAuth error responses must be a string")).to.be.string();
    code_1.expect(validErrorTypes, concat(prefix, err, "Invalid OAuth error 'error' property")).to.include(error);
    // body.error_description
    if (error_description) {
        code_1.expect(error_description, concat(prefix, err, `The 'error_description' property of OAuth error responses must be a string if present`)).to.be.string();
    }
    // body.error_uri
    if (error_uri) {
        code_1.expect(error_uri, concat(prefix, err, `If present, the 'error_uri' property of OAuth error responses must be a string`)).to.be.string();
        code_1.expect(error_uri, concat(prefix, err, `If present, the 'error_uri' property of OAuth error responses must be an url`)).to.match(/^https?:\/\/.+/);
    }
}
exports.expectOAuthError = expectOAuthError;
/**
 * @category Response Assertion
 */
function expectOAuthErrorType(response, type, prefix = "") {
    expectOAuthError(response, prefix);
    const err = "Got " + lib_1.getErrorMessageFromResponse(response);
    code_1.expect(response.body.error, concat(prefix, err, `The OAuth error 'error' property is expected to equal "${type}"`)).to.equal(type);
}
exports.expectOAuthErrorType = expectOAuthErrorType;
/**
 * @category Response Assertion
 */
function expectSuccessfulAuth(response, prefix = "") {
    expectJsonResponse(response, prefix);
    const { access_token, expires_in, token_type, scope } = response.body;
    const error = "Got " + lib_1.getErrorMessageFromResponse(response);
    // access_token
    code_1.expect(access_token, concat(prefix, error, `The "access_token" property of the token response is missing`)).to.exist();
    code_1.expect(access_token, concat(prefix, error, `The "access_token" property of the token response must be string`)).to.be.string();
    code_1.expect(access_token, concat(prefix, error, `The "access_token" property of the token response cannot be empty`)).to.not.be.empty();
    // expires_in
    code_1.expect(expires_in, concat(prefix, error, `The "expires_in" property of the token response is missing`)).to.exist();
    code_1.expect(expires_in, concat(prefix, error, `The "expires_in" property of the token response must be a number`)).to.be.number();
    code_1.expect(expires_in, concat(prefix, error, `The "expires_in" property of the token response must be greater than 0`)).to.be.above(0);
    // token_type
    code_1.expect(token_type, concat(prefix, error, `The "token_type" property of the token response must be "bearer"`)).to.match(/^bearer$/i);
    // scope
    code_1.expect(scope, concat(prefix, error, `The "scope" property of the token response is missing`)).to.exist();
    code_1.expect(scope, concat(prefix, error, `The "scope" property of the token response must be a string`)).to.be.string();
    code_1.expect(scope, concat(prefix, error, `The "scope" property of the token response cannot be empty`)).to.not.be.empty();
    const requestedScopeSet = lib_1.scopeSet(response.request.options.form.scope);
    const grantedScopeSet = lib_1.scopeSet(scope);
    // // Warning if the server is giving implicit write access
    // const starScopes = grantedScopeSet.filter(s => s.action === "*")
    // if (starScopes.length) {
    //     this.testApi.console.warn(
    //         `${message}The server is granting implicit write access to Bulk Data clients, even if they don't need it. ` +
    //         `Granted write scopes: \`${starScopes.join(", ")}\`.`
    //     )
    // }
    // // Warning if the server is explicit implicit write access
    // const writeScopes = grantedScopeSet.filter(s => s.action === "write")
    // if (writeScopes.length) {
    //     this.testApi.console.warn(
    //         `${message}The server is granting explicit write access to Bulk Data clients, even if they don't need it. ` +
    //         `Granted write scopes: \`${writeScopes.join(", ")}\`.`
    //     )
    // }
    const unfulfilledScopes = lib_1.getUnfulfilledScopes(requestedScopeSet, grantedScopeSet);
    // It is a fatal error to not grant requested read access
    unfulfilledScopes.forEach(unfulfilledScope => {
        if (unfulfilledScope.action === "read") {
            throw new Error(concat(prefix, `Requested a "${unfulfilledScope}" scope but none of the granted scopes (${grantedScopeSet}) can satisfy its access requirements.`));
        }
    });
}
exports.expectSuccessfulAuth = expectSuccessfulAuth;
/**
 * @category Response Assertion
 */
function expectFailedKickOff(response, testApi, prefix = "") {
    const { statusCode } = response;
    const { options } = response.request;
    if (statusCode === 404 || statusCode === 405 /* Method Not Allowed */) {
        return testApi.setNotSupported(`${options.method} ${options.url.pathname} is not supported by this server`);
    }
    if (statusCode >= 500) {
        return testApi.setNotSupported(`${options.method} ${options.url.pathname} is not supported by this server. Received a server error.`);
    }
    expectClientError(response, concat(prefix, "The kick-off request was expected to fail"));
    expectOperationOutcome(response, concat(prefix, "In case of error the server should return an OperationOutcome"));
}
exports.expectFailedKickOff = expectFailedKickOff;
/**
 * @category Response Assertion
 */
function expectSuccessfulKickOff(response, testApi, prefix = "") {
    const { statusCode } = response;
    const { options } = response.request;
    if (statusCode === 404 || statusCode === 405 /* Method Not Allowed */) {
        return testApi.setNotSupported(`${options.method} ${options.url.pathname} is not supported by this server`);
    }
    if (statusCode >= 500) {
        return `${options.method} ${options.url.pathname} is not supported by this server. Received a server error.`;
    }
    const error = "Got: " + lib_1.getErrorMessageFromResponse(response);
    expectResponseCode(response, 202, concat(prefix, error));
    code_1.expect(response.headers["content-location"], concat(prefix, 
    // error,
    "The kick-off response must include a content-location header", lib_1.getErrorMessageFromResponse(response))).to.exist();
    // The body is optional but if set, it must be OperationOutcome
    if (response.body) {
        expectOperationOutcome(response, prefix);
    }
}
exports.expectSuccessfulKickOff = expectSuccessfulKickOff;
/**
 * @category Response Assertion
 */
function expectSuccessfulExport(response, prefix = "") {
    const error = "Got: " + lib_1.getErrorMessageFromResponse(response);
    expectResponseCode(response, 200, concat(prefix, error));
    expectJsonResponse(response, concat(prefix, error));
    // The server MAY return an Expires header indicating when the files listed will no longer be available.
    const { expires, date } = response.headers;
    if (expires) {
        code_1.expect(() => {
            code_1.expect(expires, concat(prefix, "the expires header must be a string if present")).to.be.a.string();
            // If expires header is present, make sure it is in the future.
            const expiresMoment = moment_1.default(expires, [
                // Preferred HTTP date (Sun, 06 Nov 1994 08:49:37 GMT)
                moment_1.default.RFC_2822,
                // Obsolete HTTP date (Sunday, 06-Nov-94 08:49:37 GMT)
                "dddd, DD-MMM-YY HH:mm:ss ZZ",
                // Obsolete HTTP date (Sun  Nov  6    08:49:37 1994)
                "ddd MMM D HH:mm:ss YYYY",
                // The following formats are often used (even though they shouldn't be):
                // ISO_8601 (2020-12-24 19:50:58 +0000 UTC)
                moment_1.default.ISO_8601,
                // ISO_8601 with milliseconds (2020-12-24 19:50:58.997683 +0000 UTC)
                "YYYY-MM-DD HH:mm:ss.SSS ZZ",
                "YYYY-MM-DDTHH:mm:ss.SSS ZZ"
            ]).utc(true);
            const now = moment_1.default().utc(true);
            code_1.expect(expiresMoment.diff(now, "seconds") > 0, concat(prefix, "The expires header of the status response should be a date in the future")).to.be.true();
            // Note that the above assertion might be unreliable due to small time differences between
            // the host machine that executes the tests and the server. For that reason we also check if
            // the server returns a "time" header and if so, we verify that "expires" is after "time".
            if (date) {
                const dateMoment = moment_1.default(date).utc(true);
                code_1.expect(expiresMoment.diff(dateMoment, "seconds") > 0, concat(prefix, "The expires header of the status response should be a date after the one in the date header")).to.be.true();
            }
        }, "Invalid expires header");
    }
}
exports.expectSuccessfulExport = expectSuccessfulExport;
/**
 * @category Response Assertion
 */
function expectSuccessfulDownload(response, prefix = "") {
    const error = "Got: " + lib_1.getErrorMessageFromResponse(response);
    expectResponseCode(response, [200, 304], concat(prefix, error));
    expectNDJsonResponse(response, concat(prefix, error));
}
exports.expectSuccessfulDownload = expectSuccessfulDownload;
/**
 * @category Response Assertion
 */
function expectExportNotEmpty(response, prefix = "") {
    expectSuccessfulExport(response, prefix);
    code_1.expect(response.body.output, concat(prefix, "The export produced no files")).to.exist();
    code_1.expect(response.body.output, concat(prefix, "The export produced 0 files")).to.not.be.empty();
}
exports.expectExportNotEmpty = expectExportNotEmpty;
function expectNDJSONElements(body, elements, prefix = "") {
    body.trim().split(/\n+/).forEach(line => {
        const res = JSON.parse(line); // console.log(res);
        const resourceType = res.resourceType;
        elements.forEach(element => {
            const [a, b] = element.split(".");
            let filtered = false;
            if (b) {
                if (a === resourceType) {
                    filtered = true;
                    code_1.expect(res, concat(prefix, `Results must include '${element}' property`)).to.contain(b);
                }
            }
            else {
                filtered = true;
                code_1.expect(res, concat(prefix, `Results must include '${element}' property`)).to.contain(element);
            }
            if (filtered) {
                code_1.expect(res, concat(prefix, "Results must include meta element")).to.contain("meta");
                code_1.expect(res.meta, concat(prefix, "The meta element must have a 'tag' property")).to.contain("tag");
                code_1.expect(res.meta.tag, concat(prefix, "The 'meta.tag' property must be an array")).to.be.an.array();
                code_1.expect(res.meta.tag, concat(prefix, "A tag with code='SUBSETTED' and system='http://terminology.hl7.org/CodeSystem/v3-ObservationValue' " +
                    "should be found in the 'meta.tag' array")).to.contain({
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
                    "code": "SUBSETTED"
                });
            }
        });
    });
}
exports.expectNDJSONElements = expectNDJSONElements;
/**
 *
 * @param item
 * @param type
 * @param prefix
 * @internal
 */
function expectValidManifestEntry(item, type, prefix = "") {
    // type - the FHIR resource type that is contained in the file. Note: Each file MUST contain
    // resources of only one type, but a server MAY create more than one file for each resource
    // type returned. The number of resources contained in a file MAY vary between servers. If no
    // data are found for a resource, the server SHOULD NOT return an output item for that resource
    // in the response.
    code_1.expect(item, concat(prefix, "every item must have 'type' property")).to.include("type");
    code_1.expect(item.type, concat(prefix, `every item's 'type' property must equal "${type}"`)).to.equal(type);
    // url - the path to the file. The format of the file SHOULD reflect that requested in the
    // _outputFormat parameter of the initial kick-off request. Note that the files-for-download
    // MAY be served by a file server other than a FHIR-specific server.
    code_1.expect(item, concat(prefix, "every item must have 'url' property")).to.include("url");
    code_1.expect(item.url, concat(prefix, "every item url must be a string")).to.be.a.string();
    code_1.expect(item.url, concat(prefix, "every item url must be an url")).to.match(/^https?\:\/\/.+/);
    // Each file item MAY optionally contain the following field:
    if (item.hasOwnProperty("count")) {
        // count - the number of resources in the file, represented as a JSON number.
        code_1.expect(item.count, concat(prefix, "if set, item count must be a number greater than 0")).to.be.a.number().above(0);
    }
}
exports.expectValidManifestEntry = expectValidManifestEntry;
exports.assert = {
    bulkData: {
        auth: {
            OK: expectSuccessfulAuth,
            notOK: expectUnauthorized,
        },
        kickOff: {
            OK: expectSuccessfulKickOff,
            notOK: expectFailedKickOff
        },
        status: {
            OK: expectSuccessfulExport,
            notEmpty: expectExportNotEmpty,
            pending: (res, prefix = "") => expectResponseCode(res, 202, prefix),
            notOK: (res, prefix = "") => expectClientError(res, prefix)
        },
        download: {
            OK: expectSuccessfulDownload,
            notOK: (res, prefix = "") => expectClientError(res, prefix),
            withElements: expectNDJSONElements
        },
        cancellation: {
            OK: (res, prefix = "") => {
                expectResponseCode(res, 202, prefix);
                if (res.body) {
                    expectOperationOutcome(res, prefix);
                }
            },
            notOK: (res, prefix = "") => {
                expectResponseCode(res, 404, prefix);
                expectOperationOutcome(res, prefix);
            }
        },
        manifest: {
            OK: (res, prefix = "") => {
                exports.assert.bulkData.manifest.body.OK(res.body, concat(prefix, "Invalid manifest body"));
            },
            body: {
                OK: (manifest, kickOffUrl, prefix = "") => {
                    // transactionTime - a FHIR instant type that indicates the server's time when the query is run.
                    // The response SHOULD NOT include any resources modified after this instant, and SHALL include
                    // any matching resources modified up to (and including) this instant. Note: to properly meet
                    // these constraints, a FHIR Server might need to wait for any pending transactions to resolve
                    // in its database, before starting the export process.
                    code_1.expect(manifest, concat(prefix, "the response must contain 'transactionTime'")).to.include("transactionTime");
                    code_1.expect(manifest.transactionTime, concat(prefix, "transactionTime must be a string")).to.be.a.string();
                    code_1.expect(manifest.transactionTime, concat(prefix, "transactionTime must be FHIR instant")).to.match(REGEXP_INSTANT);
                    // the full URI of the original bulk data kick-off request
                    code_1.expect(manifest, concat(prefix, "the response must contain 'request'")).to.include("request");
                    code_1.expect(manifest.request, concat(prefix, "the 'request' property must contain the kick-off URL")).to.equal(kickOffUrl);
                    // requiresAccessToken - boolean value of true or false indicating whether downloading the generated
                    // files requires a bearer access token. Value MUST be true if both the file server and the FHIR API
                    // server control access using OAuth 2.0 bearer tokens. Value MAY be false for file servers that use
                    // access-control schemes other than OAuth 2.0, such as downloads from Amazon S3 bucket URIs or
                    // verifiable file servers within an organization's firewall.
                    code_1.expect(manifest, concat(prefix, "the response must contain 'requiresAccessToken'")).to.include("requiresAccessToken");
                    code_1.expect(manifest.requiresAccessToken, concat(prefix, "the 'requiresAccessToken' property must have a boolean value")).to.be.boolean();
                    // array of bulk data file items with one entry for each generated
                    // file. Note: If no resources are returned from the kick-off
                    // request, the server SHOULD return an empty array.
                    code_1.expect(manifest, concat(prefix, "the response must contain an 'output' array")).to.include("output");
                    code_1.expect(manifest.output, concat(prefix, "the 'output' property must be an array")).to.be.an.array();
                    exports.assert.bulkData.manifest.output.OK(manifest.output, prefix);
                    // Error, warning, and information messages related to the export should be
                    // included here (not in output). If there are no relevant messages, the server
                    // SHOULD return an empty array.
                    // Note: this field may be renamed in a future version of this IG to reflect the
                    // inclusion of OperationOutcome resources with severity levels other than error.
                    code_1.expect(manifest, concat(prefix, "the response must contain an 'error' array")).to.include("error");
                    code_1.expect(manifest.error, concat(prefix, "the 'error' property must be an array")).to.be.an.array();
                    exports.assert.bulkData.manifest.error.OK(manifest.error, prefix);
                    if (manifest.deleted) {
                        code_1.expect(manifest.deleted, concat(prefix, "If set, the 'deleted' property must be an array")).to.be.an.array();
                        exports.assert.bulkData.manifest.deleted.OK(manifest.deleted, prefix);
                    }
                }
            },
            output: {
                OK: (items, type, prefix = "") => {
                    items.forEach((item, i) => {
                        expectValidManifestEntry(item, type, concat(prefix, `Invalid manifest entry at manifest.output[${i}]`));
                    });
                },
            },
            deleted: {
                OK: (items, prefix = "") => {
                    items.forEach((item, i) => {
                        expectValidManifestEntry(item, "Bundle", concat(prefix, `Invalid manifest entry at manifest.deleted[${i}]`));
                    });
                },
            },
            error: {
                OK: (items, prefix = "") => {
                    items.forEach((item, i) => {
                        expectValidManifestEntry(item, "OperationOutcome", concat(prefix, `Invalid manifest entry at manifest.error[${i}]`));
                    });
                },
            }
        }
    },
    response: {
        statusCode: expectResponseCode,
        statusText: expectResponseText,
        clientError: expectClientError,
        json: expectJsonResponse,
        ndJson: expectNDJsonResponse,
        fhirResource: expectFhirResource,
        fhirResourceType: expectFhirResourceType,
        OperationOutcome: expectOperationOutcome,
        oauthError: expectOAuthError,
        oauthErrorType: expectOAuthErrorType,
    }
};
function checkKickOffSupport(response) {
    const { statusCode } = response;
    const { options } = response.request;
    if (statusCode === 404 || statusCode === 405 /* Method Not Allowed */) {
        return `${options.method} ${options.url.pathname} is not supported by this server`;
    }
    if (statusCode >= 500) {
        return `${options.method} ${options.url.pathname} is not supported by this server. Received a server error.`;
    }
}
function checkForGrantedWriteScopes(response, console) {
    const grantedScopeSet = lib_1.scopeSet(response.body.scope);
    // Warning if the server is giving implicit write access
    const starScopes = grantedScopeSet.filter(s => s.action === "*");
    if (starScopes.length) {
        this.testApi.console.warn(`The server is granting implicit write access to Bulk Data clients, even ` +
            `if they don't need it. Granted write scopes: \`${starScopes.join(", ")}\`.`);
    }
    // Warning if the server is explicit implicit write access
    const writeScopes = grantedScopeSet.filter(s => s.action === "write");
    if (writeScopes.length) {
        this.testApi.console.warn(`The server is granting explicit write access to Bulk Data clients, even ` +
            `if they don't need it. Granted write scopes: \`${writeScopes.join(", ")}\`.`);
    }
}
function getImplicitlyGrantedWriteScopes(response) {
    return lib_1.scopeSet(response.body.scope).filter(s => s.action === "*");
}
function getExplicitlyGrantedWriteScopes(response) {
    return lib_1.scopeSet(response.body.scope).filter(s => s.action === "write");
}
// expectSuccessfulDownloadResponse
// expectSuccessfulAuthorization
// expectGrantedAuthorization
//# sourceMappingURL=assertions.js.map