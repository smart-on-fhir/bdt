"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectNDJSONElements = exports.expectExportNotEmpty = exports.expectSuccessfulDownload = exports.expectSuccessfulExport = exports.expectSuccessfulKickOff = exports.expectFailedKickOff = exports.expectSuccessfulAuth = exports.expectOAuthErrorType = exports.expectOAuthError = exports.expectUnauthorized = exports.expectOperationOutcome = exports.expectFhirResourceType = exports.expectFhirResource = exports.expectNDJsonResponse = exports.expectJsonResponse = exports.expectClientError = exports.expectResponseText = exports.expectResponseCode = exports.concat = void 0;
const code_1 = require("@hapi/code");
const lib_1 = require("./lib");
function concat(...messages) {
    // for (let i = 0; i < messages.length; i++) {
    //     let m = String(messages[i]).trim().replace(/^\n\-\s/, "").replace(/[\s\.]*$/, "");
    //     let a = m.split("\n- ").map(x => x.replace(/^(Assertion|- )/, ""));
    //     messages[i] = a.shift()
    //     while (a.length) {
    //         messages.splice(i + 1, 0, a.shift())
    //     }
    // }
    // return "\n- " + messages.filter(Boolean).join("\n- ") + "\n- Assertion";
    return "\n- " + messages.map(x => String(x).replace(/\n\-\sAssertion$/, "").replace(/^\n\-\s*/, "").trim()).filter(Boolean).join("\n- ") + "\n- Assertion";
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