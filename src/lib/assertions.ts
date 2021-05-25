import { Response } from "got/dist/source"
import { expect } from "@hapi/code";
import { getErrorMessageFromResponse, getUnfulfilledScopes, scopeSet } from "./lib";
import { TestAPI } from "./TestAPI";
import { OAuth, BulkData, FHIR } from "./BulkDataClient";


export function concat(...messages: (string | Error)[]): string {
    // for (let i = 0; i < messages.length; i++) {
    //     let m = String(messages[i]).trim().replace(/^\n\-\s/, "").replace(/[\s\.]*$/, "");
    //     let a = m.split("\n- ").map(x => x.replace(/^(Assertion|- )/, ""));
    //     messages[i] = a.shift()
    //     while (a.length) {
    //         messages.splice(i + 1, 0, a.shift())
    //     }
    // }

    // return "\n- " + messages.filter(Boolean).join("\n- ") + "\n- Assertion";

    return "\n- " + messages.map(
        x => String(x).replace(/\n\-\sAssertion$/, "").replace(/^\n\-\s*/, "").trim()
    ).filter(Boolean).join("\n- ") + "\n- Assertion";
}

/**
 * Asserts that the `statusCode` of the given response is either:
 * 1. Equal to the given `code` argument, if that code is a number
 * 2. Listed in the given `code` argument, if that code is an array of numbers
 * @category Response Assertion
 */
export function expectResponseCode(response: Response, code: number | number[], prefix = "") {
    if (Array.isArray(code)) {
        expect(code, concat(prefix, `Unexpected status code`)).to.include(response.statusCode);
    } else {
        expect(response.statusCode, concat(prefix, `Unexpected status code`)).to.equal(code);
    }
}

/**
 * Asserts that the `statusMessage` of the given response is either:
 * 1. Equal to the given `text` argument, if that text is a string
 * 2. Listed in the given `text` argument, if that text is an array of strings
 * @category Response Assertion
 */
export function expectResponseText(response: Response, text: string | string[], prefix = "") {
    expect((response as any).statusMessage, concat(prefix, `The response has no status text`)).to.exist();
    const texts = Array.isArray(text) ? text : [ text ]
    expect(texts, concat(prefix, `Unexpected status text`)).to.include((response as any).statusMessage);
}

/**
 * Asserts that the `statusCode` of the given response is either
 * between `400` and `499`
 * @category Response Assertion
 */
export function expectClientError(response: Response, prefix = "") {
    expect(
        response.statusCode,
        concat(prefix, `Expected client error (4XX status code). Got ${response.statusCode}`)
    ).to.be.within(400, 499);
}

/**
 * @category Response Assertion
 */
export function expectJsonResponse(response: Response, prefix = "")
{
    const contentType = String(response.headers?.["content-type"] || "")
    const contentTypePrefix = contentType.toLowerCase().split(";").shift()
    const jsonTypes = [
        "application/json",
        "application/json+fhir",
        "application/fhir+json"
    ];

    expect(jsonTypes, concat(
        prefix,
        `The server must reply with JSON content-type header (${jsonTypes.join(" | ")})`,
        `Got "${contentType}"`,
        getErrorMessageFromResponse(response)
    )).to.include(contentTypePrefix);

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
        expect(response.body, concat(prefix, "The response body is undefined")).not.to.be.undefined()
        expect(response.body, concat(prefix, "The response body is null")).not.to.be.null()
        expect(response.body, concat(prefix, "The response body is not an object")).to.be.object()
    // }
}

/**
 * @category Response Assertion
 */
export function expectNDJsonResponse(response: Response, prefix = "")
{
    const contentType = String(response.headers["content-type"] || "")

    expect(contentType, concat(
        prefix,
        `The server must reply with FHIR NDJSON content-type header. Got "${contentType}"`,
        getErrorMessageFromResponse(response)
    )).to.startWith("application/fhir+ndjson");

    expect(response.body, concat(prefix, "The response body is not a string")).to.be.string()
    expect(response.body, concat(prefix, "The response body is empty")).to.not.be.empty()

    const lines = (response.body + "").split(/\n/);
    let i = 0
    for (const line of lines) {
        i++
        if (!line.trim()) {
            continue;
        }
        try {
            const obj = JSON.parse(line)
            if (!obj || typeof obj !== "object") {
                throw new Error("line is not a JSON object")
            }
        } catch (err) {
            err.message = concat(prefix, `Error parsing NDJSON at line ${i}: ${err.message}`)
            throw err
        }
    }
}

/**
 * @category Response Assertion
 */
export function expectFhirResource(response: Response, prefix = "")
{
    expectJsonResponse(response, prefix)
    expect(response.body, concat(prefix, 'The response body has no "resourceType"')).to.include("resourceType")
}

/**
 * @category Response Assertion
 */
export function expectFhirResourceType(response: Response, resourceType: string, prefix = "")
{
    expectFhirResource(response, prefix)
    expect((response.body as FHIR.Resource).resourceType, concat(prefix, "Unexpected resourceType")).to.equal(resourceType)
}

/**
 * @category Response Assertion
 */
export function expectOperationOutcome(response: Response, prefix = "")
{
    expectFhirResourceType(response, "OperationOutcome", prefix)
}

/**
 * @category Response Assertion
 */
export function expectUnauthorized(response: Response, prefix = "")
{
    const acceptable = {
        401: "Unauthorized",
        406: "Not Acceptable"
    };

    expectResponseCode(response, Object.keys(acceptable).map(Number), prefix)

    // Some servers return empty statusMessage
    // TODO: Decide if we need to do this. Is 401 ok with custom status text?
    if (response.statusMessage) {
        expectResponseText(response, Object.values(acceptable), prefix)
    }
}

/**
 * @category Response Assertion
 */
export function expectOAuthError(response: Response, prefix = ""): void
{
    expectJsonResponse(response, prefix)
    expectClientError(response, prefix)

    const body = response.body as OAuth.ErrorResponse;

    const validErrorTypes = [
        "invalid_request",
        "invalid_client",
        "invalid_grant",
        "unauthorized_client",
        "unsupported_grant_type",
        "invalid_scope"
    ];

    const { error, error_description, error_uri } = body

    const err = "Got " + getErrorMessageFromResponse(response)

    // body.error
    expect(error, concat(prefix, err, "The 'error' property of OAuth error responses is required")).to.exist()
    expect(error, concat(prefix, err, "The 'error' property of OAuth error responses must be a string")).to.be.string()
    expect(validErrorTypes, concat(prefix, err, "Invalid OAuth error 'error' property")).to.include(error)

    // body.error_description
    if (error_description) {
        expect(error_description, concat(prefix, err, `The 'error_description' property of OAuth error responses must be a string if present`)).to.be.string()
    }

    // body.error_uri
    if (error_uri) {
        expect(error_uri, concat(prefix, err, `If present, the 'error_uri' property of OAuth error responses must be a string`)).to.be.string()
        expect(error_uri, concat(prefix, err, `If present, the 'error_uri' property of OAuth error responses must be an url`)).to.match(/^https?:\/\/.+/)
    }
}

/**
 * @category Response Assertion
 */
export function expectOAuthErrorType(response: Response, type: OAuth.errorType, prefix = ""): void {
    expectOAuthError(response, prefix)
    const err = "Got " + getErrorMessageFromResponse(response)
    expect(
        (response.body as OAuth.ErrorResponse).error,
        concat(prefix, err, `The OAuth error 'error' property is expected to equal "${type}"`)
    ).to.equal(type)
}

/**
 * @category Response Assertion
 */
export function expectSuccessfulAuth(response: Response, prefix = "")
{
    expectJsonResponse(response, prefix)

    const { access_token, expires_in, token_type, scope } = response.body as OAuth.TokenResponse

    const error = "Got " + getErrorMessageFromResponse(response)

    // access_token
    expect(access_token, concat(prefix, error, `The "access_token" property of the token response is missing`)).to.exist()
    expect(access_token, concat(prefix, error, `The "access_token" property of the token response must be string`)).to.be.string()
    expect(access_token, concat(prefix, error, `The "access_token" property of the token response cannot be empty`)).to.not.be.empty()

    // expires_in
    expect(expires_in, concat(prefix, error, `The "expires_in" property of the token response is missing`)).to.exist()
    expect(expires_in, concat(prefix, error, `The "expires_in" property of the token response must be a number`)).to.be.number()
    expect(expires_in, concat(prefix, error, `The "expires_in" property of the token response must be greater than 0`)).to.be.above(0)
    
    // token_type
    expect(token_type, concat(prefix, error, `The "token_type" property of the token response must be "bearer"`)).to.match(/^bearer$/i)

    // scope
    expect(scope, concat(prefix, error, `The "scope" property of the token response is missing`)).to.exist()
    expect(scope, concat(prefix, error, `The "scope" property of the token response must be a string`)).to.be.string()
    expect(scope, concat(prefix, error, `The "scope" property of the token response cannot be empty`)).to.not.be.empty()

    const requestedScopeSet = scopeSet(response.request.options.form.scope)
    const grantedScopeSet   = scopeSet(scope) 

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

    const unfulfilledScopes = getUnfulfilledScopes(requestedScopeSet, grantedScopeSet)

    // It is a fatal error to not grant requested read access
    unfulfilledScopes.forEach(unfulfilledScope => {
        if (unfulfilledScope.action === "read") {
            throw new Error(concat(
                prefix,
                `Requested a "${unfulfilledScope}" scope but none of the granted scopes (${
                grantedScopeSet}) can satisfy its access requirements.`
            ))
        }
    })
}

/**
 * @category Response Assertion
 */
export function expectFailedKickOff(response: Response, testApi: TestAPI, prefix = "")
{
    const { statusCode } = response
    const { options } = response.request

    if (statusCode === 404 || statusCode === 405 /* Method Not Allowed */) {
        return testApi.setNotSupported(
            `${options.method} ${options.url.pathname} is not supported by this server`
        );
    }

    if (statusCode >= 500) {
        return testApi.setNotSupported(
            `${options.method} ${options.url.pathname} is not supported by this server. Received a server error.`
        );
    }

    expectClientError(response, concat(prefix, "The kick-off request was expected to fail"))
    
    expectOperationOutcome(
        response,
        concat(prefix, "In case of error the server should return an OperationOutcome")
    );
}

/**
 * @category Response Assertion
 */
export function expectSuccessfulKickOff(response: Response, testApi: TestAPI, prefix = "")
{
    const { statusCode } = response
    const { options } = response.request

    if (statusCode === 404 || statusCode === 405 /* Method Not Allowed */) {
        return testApi.setNotSupported(
            `${options.method} ${options.url.pathname} is not supported by this server`
        )
    }

    if (statusCode >= 500) {
        return `${options.method} ${options.url.pathname} is not supported by this server. Received a server error.`
    }
    
    const error = "Got: " + getErrorMessageFromResponse(response)

    expectResponseCode(response, 202, concat(prefix, error))
    

    expect(response.headers["content-location"], concat(
        prefix,
        // error,
        "The kick-off response must include a content-location header",
        getErrorMessageFromResponse(response)
    )).to.exist();

    // The body is optional but if set, it must be OperationOutcome
    if (response.body) {
        expectOperationOutcome(response, prefix);
    }
}

/**
 * @category Response Assertion
 */
export function expectSuccessfulExport(response: Response, prefix = "")
{
    const error = "Got: " + getErrorMessageFromResponse(response)
    expectResponseCode(response, 200, concat(prefix, error))
    expectJsonResponse(response, concat(prefix, error))
}

/**
 * @category Response Assertion
 */
export function expectSuccessfulDownload(response: Response, prefix = "")
{
    const error = "Got: " + getErrorMessageFromResponse(response)
    expectResponseCode(response, [200, 304], concat(prefix, error))
    expectNDJsonResponse(response, concat(prefix, error))
}

/**
 * @category Response Assertion
 */
export function expectExportNotEmpty(response: Response, prefix = "")
{
    expectSuccessfulExport(response, prefix)
    expect((response.body as any).output, concat(prefix, "The export produced no files")).to.exist()
    expect((response.body as any).output, concat(prefix, "The export produced 0 files")).to.not.be.empty()
}

export function expectNDJSONElements(body: string, elements: string[], prefix = "")
{
    body.trim().split(/\n+/).forEach(line => {
        const res = JSON.parse(line); // console.log(res);
        const resourceType = res.resourceType
        elements.forEach(element => {
            const [a, b] = element.split(".");
            let filtered = false;
            if (b) {
                if (a === resourceType) {
                    filtered = true
                    expect(res, concat(prefix, `Results must include '${element}' property`)).to.contain(b);
                }
            } else {
                filtered = true
                expect(res, concat(prefix, `Results must include '${element}' property`)).to.contain(element);
            }

            if (filtered) {
                expect(res, concat(prefix, "Results must include meta element")).to.contain("meta");
                expect(res.meta, concat(prefix, "The meta element must have a 'tag' property")).to.contain("tag");
                expect(res.meta.tag, concat(prefix, "The 'meta.tag' property must be an array")).to.be.an.array();
                expect(
                    res.meta.tag,
                    concat(
                        prefix, 
                        "A tag with code='SUBSETTED' and system='http://terminology.hl7.org/CodeSystem/v3-ObservationValue' " +
                        "should be found in the 'meta.tag' array"
                    )
                ).to.contain({
                    "system":"http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
                    "code":"SUBSETTED"
                });
            }
        });
    });
}









function checkKickOffSupport(response: Response)
{
    const { statusCode } = response
    const { options } = response.request

    if (statusCode === 404 || statusCode === 405 /* Method Not Allowed */) {
        return `${options.method} ${options.url.pathname} is not supported by this server`
    }

    if (statusCode >= 500) {
        return `${options.method} ${options.url.pathname} is not supported by this server. Received a server error.`
    }
}

function checkForGrantedWriteScopes(response: Response<OAuth.TokenResponse>, console: Console)
{
    const grantedScopeSet = scopeSet(response.body.scope)

    // Warning if the server is giving implicit write access
    const starScopes = grantedScopeSet.filter(s => s.action === "*")
    if (starScopes.length) {
        this.testApi.console.warn(
            `The server is granting implicit write access to Bulk Data clients, even ` +
            `if they don't need it. Granted write scopes: \`${starScopes.join(", ")}\`.`
        )
    }

    // Warning if the server is explicit implicit write access
    const writeScopes = grantedScopeSet.filter(s => s.action === "write")
    if (writeScopes.length) {
        this.testApi.console.warn(
            `The server is granting explicit write access to Bulk Data clients, even ` +
            `if they don't need it. Granted write scopes: \`${writeScopes.join(", ")}\`.`
        )
    }
}

function getImplicitlyGrantedWriteScopes(response: Response<OAuth.TokenResponse>)
{
    return scopeSet(response.body.scope).filter(s => s.action === "*")
}

function getExplicitlyGrantedWriteScopes(response: Response<OAuth.TokenResponse>)
{
    return scopeSet(response.body.scope).filter(s => s.action === "write")
}


// expectSuccessfulDownloadResponse
// expectSuccessfulAuthorization
// expectGrantedAuthorization
