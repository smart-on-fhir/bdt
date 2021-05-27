import { Response } from "got/dist/source"
import { expect } from "@hapi/code";
import { getErrorMessageFromResponse, getUnfulfilledScopes, roundToPrecision, scopeSet } from "./lib";
import { TestAPI } from "./TestAPI";
import { OAuth, BulkData, FHIR } from "./BulkDataClient";
import moment from "moment";

const REGEXP_INSTANT = new RegExp(
    "([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-" +
    "(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3])" +
    ":[0-5][0-9]:([0-5][0-9]|60)(\\.[0-9]+)?(Z|(\\+|-)((0[0-9]|1[0-3])" +
    ":[0-5][0-9]|14:00))"
);

const HTTP_DATE_FORMATS = [

    // Preferred HTTP date (Sun, 06 Nov 1994 08:49:37 GMT)
    moment.RFC_2822,

    // Obsolete HTTP date (Sunday, 06-Nov-94 08:49:37 GMT)
    "dddd, DD-MMM-YY HH:mm:ss ZZ",

    // Obsolete HTTP date (Sun  Nov  6    08:49:37 1994)
    "ddd MMM D HH:mm:ss YYYY",

    // The following formats are often used (even though they shouldn't be):

    // ISO_8601 (2020-12-24 19:50:58 +0000 UTC)
    moment.ISO_8601,

    // ISO_8601 with milliseconds (2020-12-24 19:50:58.997683 +0000 UTC)
    "YYYY-MM-DD HH:mm:ss.SSS ZZ",
    "YYYY-MM-DDTHH:mm:ss.SSS ZZ"
];

export interface AssertAPI {
    bulkData: BulkDataAssertion
    response: ResponseAssertions
}

export interface BulkDataAssertion {
    auth: {
        OK: (response: Response, prefix?: string) => void;
        notOK: (response: Response, prefix?: string) => void
    };
    cancellation: {
        OK: (res: Response<unknown>, prefix?: string) => void;
        notOK: (res: Response<unknown>, prefix?: string) => void
    };
    download: {
        OK: (response: Response, prefix?: string) => void;
        notOK: (res: Response<unknown>, prefix?: string) => void;
        withElements: (body: string, elements: string[], prefix?: string) => void
    };
    kickOff: {
        OK: (response: Response, testApi: TestAPI, prefix?: string) => string | void;
        notOK: (response: Response, testApi: TestAPI, prefix?: string) => void
    };

    /**
     * A set of assertions to verify the proper structure of the export manifest
     */
    manifest: ManifestAssertions

    /**
     * A set of assertions to be executed against the status endpoint's response
     */
    status: StatusResponseAssertions
}

/**
 * A set of assertions to be executed against the status endpoint's response
 */
export interface StatusResponseAssertions {
    /**
     * Asserts that the status endpoint replies with 200 OK and a JSON body
     * that is a valid export manifest and that the `expires` header is valid
     * if present.
     * @tutorial https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---complete-status
     * @example
     * ```ts
     * assert.bulkData.status.OK(response, "Status response is invalid")
     * ```
     */
    OK(response: BulkData.StatusResponse<BulkData.ExportManifest>, prefix?: string): void

    /**
     * Asserts that the status endpoint reply is valid, but also produces
     * non-empty `output` array.
     * @example
     * ```ts
     * assert.bulkData.status.notEmpty(response, "No files exported")
     * ```
     */
    notEmpty(response: BulkData.StatusResponse<BulkData.ExportManifest>, prefix?: string): void
    
    /**
     * @tutorial https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---error-status-1
     * @example
     * ```ts
     * assert.bulkData.status.notOK(response, "The status endpoint was expected to fail")
     * ```
     */
    notOK(res: BulkData.StatusResponse<FHIR.OperationOutcome>, prefix?: string): void

    /**
     * Asserts that:
     * - The status endpoint replies with `202 Accepted`.
     * - No `content-location` header is present
     * - If set, the `x-progress` header is less than than 100 characters long
     * - If set, the `retry-after` header is valid HTTP Date in the future, or
     *   a positive decimal integer
     * 
     * > Optionally, the server MAY return an `X-Progress` header with a text
     *   description of the status of the request that’s less than 100 characters.
     *   The format of this description is at the server’s discretion and may be a
     *   percentage complete value, or a more general status such as “in progress”.
     *   The client MAY parse the description, display it to the user, or log it.
     * 
     * **NOTE:** This will only work properly if called after successful kick-off
     * and before the export is complete!
     * @tutorial https://hl7.org/Fhir/uv/bulkdata/export/index.html#response---in-progress-status
     * @example
     * ```ts
     * assert.bulkData.status.pending(response, "The status must be pending")
     * ```
     */
    pending(res: BulkData.StatusResponse<any>, prefix?: string): void
}

/**
 * A set of assertions to verify the proper structure of the export manifest
 */
export interface ManifestAssertions {
    OK(res: Response<BulkData.ExportManifest>, prefix?: string): void
    body: ManifestBodyAssertions
    deleted: ManifestDeletedAssertions
    error: ManifestErrorAssertions
    output: ManifestOutputAssertions
}

/**
 * Assertions for the body of the export manifest
 */
export interface ManifestBodyAssertions {
    OK(manifest: BulkData.ExportManifest, kickOffUrl: string, prefix?: string): void
}

export interface ManifestDeletedAssertions {
    OK(items: BulkData.ExportManifestFile<"Bundle">[], prefix?: string): void
}

export interface ManifestErrorAssertions {
    OK(items: BulkData.ExportManifestFile<"OperationOutcome">[], prefix?: string): void
};

/**
 * Assertions for the body of the export manifest
 */
export interface ManifestOutputAssertions {
    OK(items: BulkData.ExportManifestFile<string>[], type: string, prefix?: string): void
}

export interface ResponseAssertions {
    OperationOutcome(response: Response, prefix?: string): void;
    clientError(response: Response, prefix?: string): void;
    fhirResource(response: Response, prefix?: string): void;
    fhirResourceType(response: Response, resourceType: string, prefix?: string): void;
    json(response: Response, prefix?: string): void;
    ndJson(response: Response, prefix?: string): void;
    oauthError(response: Response, prefix?: string): void;
    oauthErrorType(response: Response, type: OAuth.errorType, prefix?: string): void;
    statusCode(response: Response, code: number | number[], prefix?: string): void;
    statusText(response: Response, text: string | string[], prefix?: string): void
}


export function concat(...messages: (string | Error)[]): string {
    // for (let i = 0; i < messages.length; i++) {
    //     let m = String(messages[i]).trim().replace(/^\n\-\s/, "").replace(/[\s\.]*$/, "");
    //     let a = m.split("\n✖ ").map(x => x.replace(/^(Assertion|- )/, ""));
    //     messages[i] = a.shift()
    //     while (a.length) {
    //         messages.splice(i + 1, 0, a.shift())
    //     }
    // }

    // return "\n✖ " + messages.filter(Boolean).join("\n✖ ") + "\n✖ Assertion";

    return "\n✖ " + messages.map(
        x => String(x).replace(/\n✖\sAssertion$/, "").replace(/^\n✖\s*/, "").trim()
    ).filter(Boolean).join("\n✖ ") + "\n✖ Assertion";
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

export function expectHttpDate(date: string, prefix = "")
{
    const parsed = moment(date, HTTP_DATE_FORMATS).utc(true);
    expect(parsed.isValid(), concat(prefix, `"${date}" is not valid HTTP date`)).to.be.true()
}

export function expectHttpDateAfter(date: string, after: string|null = null, prefix = "")
{
    expectHttpDate(date, prefix)
    const parsed = moment(date, HTTP_DATE_FORMATS).utc(true);
    const now = moment(after).utc(true);
            
    expect(
        parsed.diff(now, "seconds") >= 0,
        concat(prefix, `"${date}" should be at least a second after "${now}"`)
    ).to.be.true();
}

export function expectHttpDateBefore(date: string, before: string|null = null, prefix = "")
{
    expectHttpDate(date, prefix)
    const parsed = moment(date, HTTP_DATE_FORMATS).utc(true);
    const now = moment(before).utc(true);
            
    expect(
        now.diff(parsed, "seconds") >= 0,
        concat(prefix, `"${date}" should be at least a second before "${now}"`)
    ).to.be.true();
}

/**
 * @category Response Assertion
 */
export function expectSuccessfulExport(response: Response, prefix = "")
{
    const error = "Got: " + getErrorMessageFromResponse(response)
    expectResponseCode(response, 200, concat(prefix, error))
    expectJsonResponse(response, concat(prefix, error))

    // The server MAY return an Expires header indicating when the files listed will no longer be available.
    // Note that comparing with "now" might be unreliable due to small time differences between
    // the host machine that executes the tests and the server. For that reason we also check if
    // the server returns a "date" header and if so, we verify that "expires" is after "date".
    const { expires, date } = response.headers
    if (expires) {
        expectHttpDateAfter(expires, date || null, concat(prefix, "Invalid 'expires' header"))
    }
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

/**
 * 
 * @param item 
 * @param type 
 * @param prefix 
 * @internal
 */
export function expectValidManifestEntry(item: BulkData.ExportManifestFile, type: string, prefix = "") {
    // type - the FHIR resource type that is contained in the file. Note: Each file MUST contain
    // resources of only one type, but a server MAY create more than one file for each resource
    // type returned. The number of resources contained in a file MAY vary between servers. If no
    // data are found for a resource, the server SHOULD NOT return an output item for that resource
    // in the response.
    expect(item, concat(prefix, "every item must have 'type' property")).to.include("type");
    expect(item.type, concat(prefix, `every item's 'type' property must equal "${type}"`)).to.equal(type);
    
    // url - the path to the file. The format of the file SHOULD reflect that requested in the
    // _outputFormat parameter of the initial kick-off request. Note that the files-for-download
    // MAY be served by a file server other than a FHIR-specific server.
    expect(item, concat(prefix, "every item must have 'url' property")).to.include("url");
    expect(item.url, concat(prefix, "every item url must be a string")).to.be.a.string();
    expect(item.url, concat(prefix, "every item url must be an url")).to.match(/^https?\:\/\/.+/);
    
    // Each file item MAY optionally contain the following field:
    if (item.hasOwnProperty("count")) {
        // count - the number of resources in the file, represented as a JSON number.
        expect(item.count, concat(prefix, "if set, item count must be a number greater than 0")).to.be.a.number().above(0);
    }
}

export const assert: AssertAPI = {
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
            pending: (res: Response, prefix="") => {
                expectResponseCode(res, 202, concat(prefix, "While pending, the status endpoint should reply with 202 status code"))

                const xProgress  = res.headers["x-progress"]
                if (xProgress) {
                    expect(xProgress.length, concat(prefix, "The x-progress cannot be more than 100 characters long")).to.be.below(100)
                }

                // The Retry-After response HTTP header indicates how long the user agent
                // should wait before making a follow-up request.
                let retryAfter = res.headers["retry-after"]
                if (retryAfter) {
                    const isDate = retryAfter.indexOf("-") > 0;

                    // http-date
                    if (isDate) {
                        expectHttpDateBefore(retryAfter, null, "Invalid retry-after header")
                    }

                    // delay-seconds
                    else {
                        const seconds = parseFloat(retryAfter)

                        expect(
                            !isNaN(seconds) && isFinite(seconds) && seconds > 0,
                            concat(prefix, "A numeric retry-after header should be valid positive number")
                        ).to.be.true()

                        expect(
                            retryAfter,
                            concat(prefix, "A numeric retry-after header should be an integer or decimal integer")
                        ).to.equal(String(roundToPrecision(retryAfter, 2)))
                    }
                }
            },
            notOK: (res: Response, prefix="") => expectClientError(res, prefix)
        },
        download: {
            OK: expectSuccessfulDownload,
            notOK: (res: Response, prefix="") => expectClientError(res, prefix),
            withElements: expectNDJSONElements
        },
        cancellation: {
            OK: (res: Response, prefix="") => {
                expectResponseCode(res, 202, prefix)
                if (res.body) {
                    expectOperationOutcome(res, prefix)
                }
            },
            notOK: (res: Response, prefix="") => {
                expectResponseCode(res, 404, prefix)
                expectOperationOutcome(res, prefix)
            }
        },
        manifest: {
            OK: (res: Response<BulkData.ExportManifest>, prefix="") => {
                assert.bulkData.manifest.body.OK(res.body, concat(prefix, "Invalid manifest body"))
            },
            body: {
                OK: (manifest: BulkData.ExportManifest, kickOffUrl: string, prefix="") => {

                    // transactionTime - a FHIR instant type that indicates the server's time when the query is run.
                    // The response SHOULD NOT include any resources modified after this instant, and SHALL include
                    // any matching resources modified up to (and including) this instant. Note: to properly meet
                    // these constraints, a FHIR Server might need to wait for any pending transactions to resolve
                    // in its database, before starting the export process.
                    expect(manifest, concat(prefix, "the response must contain 'transactionTime'")).to.include("transactionTime");
                    expect(manifest.transactionTime, concat(prefix, "transactionTime must be a string")).to.be.a.string();
                    expect(manifest.transactionTime, concat(prefix, "transactionTime must be FHIR instant")).to.match(REGEXP_INSTANT);

                    // the full URI of the original bulk data kick-off request
                    expect(manifest, concat(prefix, "the response must contain 'request'")).to.include("request");
                    expect(manifest.request, concat(prefix, "the 'request' property must contain the kick-off URL")).to.equal(kickOffUrl);

                    // requiresAccessToken - boolean value of true or false indicating whether downloading the generated
                    // files requires a bearer access token. Value MUST be true if both the file server and the FHIR API
                    // server control access using OAuth 2.0 bearer tokens. Value MAY be false for file servers that use
                    // access-control schemes other than OAuth 2.0, such as downloads from Amazon S3 bucket URIs or
                    // verifiable file servers within an organization's firewall.
                    expect(manifest, concat(prefix, "the response must contain 'requiresAccessToken'")).to.include("requiresAccessToken");
                    expect(manifest.requiresAccessToken, concat(prefix, "the 'requiresAccessToken' property must have a boolean value")).to.be.boolean();
                
                    // array of bulk data file items with one entry for each generated
                    // file. Note: If no resources are returned from the kick-off
                    // request, the server SHOULD return an empty array.
                    expect(manifest, concat(prefix, "the response must contain an 'output' array")).to.include("output");
                    expect(manifest.output, concat(prefix, "the 'output' property must be an array")).to.be.an.array();
                    assert.bulkData.manifest.output.OK(manifest.output, prefix)
    
                    // Error, warning, and information messages related to the export should be
                    // included here (not in output). If there are no relevant messages, the server
                    // SHOULD return an empty array.
                    // Note: this field may be renamed in a future version of this IG to reflect the
                    // inclusion of OperationOutcome resources with severity levels other than error.
                    expect(manifest, concat(prefix, "the response must contain an 'error' array")).to.include("error");
                    expect(manifest.error, concat(prefix, "the 'error' property must be an array")).to.be.an.array();
                    assert.bulkData.manifest.error.OK(manifest.error, prefix)

                    if (manifest.deleted) {
                        expect(manifest.deleted, concat(prefix, "If set, the 'deleted' property must be an array")).to.be.an.array();
                        assert.bulkData.manifest.deleted.OK(manifest.deleted, prefix)
                    }
                }
            },
            output: {
                OK: (items: BulkData.ExportManifestFile[], type: string, prefix="") => {
                    items.forEach((item, i) => {
                        expectValidManifestEntry(item, type, concat(prefix, `Invalid manifest entry at manifest.output[${i}]`))
                    });
                },
            },
            deleted: {
                OK: (items: BulkData.ExportManifestFile<"Bundle">[], prefix="") => {
                    items.forEach((item, i) => {
                        expectValidManifestEntry(item, "Bundle", concat(prefix, `Invalid manifest entry at manifest.deleted[${i}]`))
                    });
                },
            },
            error: {
                OK: (items: BulkData.ExportManifestFile<"OperationOutcome">[], prefix="") => {
                    items.forEach((item, i) => {
                        expectValidManifestEntry(item, "OperationOutcome", concat(prefix, `Invalid manifest entry at manifest.error[${i}]`))
                    });
                },
            }
        }
    },

    response: {
        statusCode      : expectResponseCode,
        statusText      : expectResponseText,
        clientError     : expectClientError,
        json            : expectJsonResponse,
        ndJson          : expectNDJsonResponse,
        fhirResource    : expectFhirResource,
        fhirResourceType: expectFhirResourceType,
        OperationOutcome: expectOperationOutcome,
        oauthError      : expectOAuthError,
        oauthErrorType  : expectOAuthErrorType,
    }
};







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
