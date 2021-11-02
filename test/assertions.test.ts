import * as Lab     from "@hapi/lab"
import { expect }   from "@hapi/code"
import { Response } from "got/dist/source"
import { OAuth }    from "../src/lib/BulkDataClient"
import { TestAPI }  from "../src/lib/TestAPI"
import {
    expectResponseCode,
    expectResponseText,
    expectClientError,
    expectJsonResponse,
    expectNDJsonResponse,
    expectFhirResource,
    expectFhirResourceType,
    expectOperationOutcome,
    expectUnauthorized,
    expectOAuthError,
    expectOAuthErrorType,
    expectSuccessfulAuth,
    expectFailedKickOff,
    expectSuccessfulKickOff,
    expectSuccessfulExport,
    expectSuccessfulDownload,
    expectExportNotEmpty,
    expectNDJSONElements
} from "../src/lib/assertions"


const lab = Lab.script();
const { describe, it } = lab;
export { lab };


describe('assertions', () => {

    it ("expectResponseCode", () => {
        expect(() => expectResponseCode({ statusCode: 200 } as Response, 201), "does not throw for different code").to.throw();
        expect(() => expectResponseCode({ statusCode: 200 } as Response, 201, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectResponseCode({ statusCode: 200 } as Response, [201, 300]), "does not throw if code is not listed").to.throw();
        expect(() => expectResponseCode({ statusCode: 200 } as Response, [100, 200]), "throws if code is listed").not.to.throw();
        expect(() => expectResponseCode({ statusCode: 200 } as Response, 200), "throws if code matches").not.to.throw();
    })

    it ("expectResponseText", () => {
        expect(() => expectResponseText({ statusMessage: "x" } as Response, "y"), "does not throw for different text").to.throw();
        expect(() => expectResponseText({ statusMessage: "x" } as Response, "y", "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectResponseText({ statusMessage: "x" } as Response, ["y", "z"]), "does not throw if text is not listed").to.throw();
        expect(() => expectResponseText({ statusMessage: "x" } as Response, ["x", "y"]), "throws if text is listed").not.to.throw();
        expect(() => expectResponseText({ statusMessage: "x" } as Response, "x"), "throws if text matches").not.to.throw();
    })

    it ("expectClientError", () => {
        expect(() => expectClientError({ statusCode: 200 } as Response), "should throw").to.throw(/Expected client error \(4XX status code\)\. Got 200/);
        expect(() => expectClientError({ statusCode: 200 } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectClientError({ statusCode: 399 } as Response), "should throw for 399").to.throw();
        expect(() => expectClientError({ statusCode: 500 } as Response), "should throw for 500").to.throw();
        expect(() => expectClientError({ statusCode: 400 } as Response), "should not throw for 400").not.to.throw();
        expect(() => expectClientError({ statusCode: 499 } as Response), "should not throw for 499").not.to.throw();
    })

    it ("expectJsonResponse", () => {
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: "" } as Response), "should throw").to.throw(/The response body is not an object/);
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: 200 } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: undefined } as Response), "should throw for undefined").to.throw(/The response body is undefined/);
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: null } as Response), "should throw for null").to.throw(/The response body is null/);
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: "" } as Response), "should throw for ''").to.throw(/The response body is not an object/);
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: "{}" } as Response), "should throw for '{}'").to.throw();
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json" }, body: {} } as Response), "should not throw for {}").not.to.throw();
        expect(() => expectJsonResponse({ headers: { "content-type": "text/plain" }, body: {} } as Response), "should throw for text/plain").to.throw();
        expect(() => expectJsonResponse({ headers: { "content-type": "application/json+fhir" }, body: {} } as Response), "should not throw for application/json+fhir").not.to.throw();
        expect(() => expectJsonResponse({ headers: { "content-type": "application/fhir+json" }, body: {} } as Response), "should not throw for application/json+fhir").not.to.throw();
    })

    it ("expectNDJsonResponse", () => {
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/fhir+ndjson" }, body: 200 } as Response), "should throw").to.throw(/The response body is not a string/);
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/fhir+ndjson" }, body: 200 } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/fhir+ndjson" }, body: "" } as Response), "should throw").to.throw(/The response body is empty/);
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/fhir+json" }, body: "" } as Response), "should throw for application/fhir+json").to.throw();
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/ndjson" }, body: "" } as Response), "should throw for application/ndjson").to.throw();
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/fhir+ndjson" }, body: "{}\n{x}\n{}\n" } as Response), "should throw for invalid json line").to.throw(/Error parsing NDJSON at line 2\:/);
        expect(() => expectNDJsonResponse({ headers: { "content-type": "application/fhir+ndjson" }, body: 200 } as Response, "test-prefix"), "does not include prefix").to.throw(/test-prefix/);
    })

    it ("expectFhirResource", () => {
        expect(() => expectFhirResource({ headers: { "content-type": "application/json" }, body: {} } as Response), "should throw").to.throw(/The response body has no "resourceType"/);
        expect(() => expectFhirResource({ headers: { "content-type": "application/json" }, body: {} } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectFhirResource({ headers: { "content-type": "application/json" }, body: { resourceType: "x" } } as Response), "should not throw").not.to.throw();
    })

    it ("expectFhirResourceType", () => {
        expect(() => expectFhirResourceType({ headers: { "content-type": "application/json" }, body: { resourceType: "y" } } as Response, "x"), "should throw").to.throw(/Unexpected resourceType/);
        expect(() => expectFhirResourceType({ headers: { "content-type": "application/json" }, body: { resourceType: "y" } } as Response, "x", "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectFhirResourceType({ headers: { "content-type": "application/json" }, body: { resourceType: "x" } } as Response, "x"), "should not throw").not.to.throw();
    })
    
    it ("expectOperationOutcome", () => {
        expect(() => expectOperationOutcome({ headers: { "content-type": "application/json" }, body: { resourceType: "y" } } as Response), "should throw").to.throw(/Unexpected resourceType/);
        expect(() => expectOperationOutcome({ headers: { "content-type": "application/json" }, body: { resourceType: "y" } } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectOperationOutcome({ headers: { "content-type": "application/json" }, body: { resourceType: "OperationOutcome" } } as Response), "should not throw").not.to.throw();
    })

    it ("expectUnauthorized", () => {
        expect(() => expectUnauthorized({ statusCode: 400 } as Response), "should throw").to.throw(/Unexpected status code/);
        expect(() => expectUnauthorized({ statusCode: 400 } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectUnauthorized({ statusCode: 401 } as Response), "should not throw").not.to.throw();
        expect(() => expectUnauthorized({ statusCode: 406 } as Response), "should not throw").not.to.throw();
    })

    it ("expectOAuthError", () => {
        expect(() => expectOAuthError({ statusCode: 400, headers: { "content-type": "application/json" }, body: {} } as Response), "should throw if no error").to.throw(/The 'error' property of OAuth error responses is required/);
        expect(() => expectOAuthError({ statusCode: 400, headers: { "content-type": "application/json" }, body: {} } as Response, "test-prefix"), "does not include the prefix in the message").to.throw(/test-prefix/);
        expect(() => expectOAuthError({ statusCode: 400, headers: { "content-type": "application/json" }, body: { error: 4 } } as Response), "should throw on invalid error").to.throw(/The 'error' property of OAuth error responses must be a string/);
        expect(() => expectOAuthError({ statusCode: 400, headers: { "content-type": "application/json" }, body: { error: "xx" } } as Response), "should throw on invalid error string").to.throw(/Invalid OAuth error 'error' property/);
        expect(() => expectOAuthError({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { error: "invalid_scope", error_description: 7 }
        } as Response), "should throw on invalid error_description type").to.throw(
            /The 'error_description' property of OAuth error responses must be a string if present/
        );
        expect(() => expectOAuthError({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { error: "invalid_scope", error_uri: 7 }
        } as Response), "should throw on invalid error_uri type").to.throw(
            /If present, the 'error_uri' property of OAuth error responses must be a string/
        );
        expect(() => expectOAuthError({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { error: "invalid_scope", error_uri: "abc" }
        } as Response), "should throw on invalid error_uri url").to.throw(
            /If present, the 'error_uri' property of OAuth error responses must be an url/
        );
    })

    it ("expectOAuthErrorType", () => {
        expect(() => expectOAuthErrorType({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { error: "invalid_grant" }
        } as Response<OAuth.ErrorResponse>, "invalid_scope"), "should throw on invalid error string 2").to.throw(
            /The OAuth error 'error' property is expected to equal "invalid_scope"/
        );
        expect(() => expectOAuthErrorType({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { error: "invalid_grant" }
        } as Response<OAuth.ErrorResponse>, "invalid_scope", "xx"), "did not include prefix").to.throw(/xx/);
        expect(() => expectOAuthErrorType({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { error: "invalid_grant" }
        } as Response<OAuth.ErrorResponse>, "invalid_grant"), "should not throw").not.to.throw();
    })

    it ("expectSuccessfulAuth", () => {
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: {}
        } as Response<OAuth.TokenResponse>), "should throw on missing access_token").to.throw(
            /The "access_token" property of the token response is missing/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: 4 }
        } as any), "should throw on bad access_token type").to.throw(
            /The "access_token" property of the token response must be string/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "" }
        } as any), "should throw on empty access_token").to.throw(
            /The "access_token" property of the token response cannot be empty/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x" }
        } as any), "should throw on missing expires_in").to.throw(
            /The "expires_in" property of the token response is missing/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: "d" }
        } as any), "should throw on bad expires_in type").to.throw(
            /The "expires_in" property of the token response must be a number/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: -2 }
        } as any), "should throw on bad expires_in value").to.throw(
            /The "expires_in" property of the token response must be greater than 0/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: 2, token_type: "test" }
        } as any), "should throw on bad token_type value").to.throw(
            /The "token_type" property of the token response must be "bearer"/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: 2, token_type: "bearer" }
        } as any), "should throw on missing scope").to.throw(
            /The "scope" property of the token response is missing/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: 2, token_type: "bearer", scope: 66 }
        } as any), "should throw on bad scope type").to.throw(
            /The "scope" property of the token response must be a string/
        );
        expect(() => expectSuccessfulAuth({
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: 2, token_type: "bearer", scope: "" }
        } as any), "should throw on empty scope").to.throw(
            /The "scope" property of the token response cannot be empty/
        );
        expect(() => expectSuccessfulAuth({
            request: {
                options: {
                    form: {
                        scope: "system/Patient.read"
                    }
                }
            },
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: 2, token_type: "bearer", scope: "system/Observation.read" }
        } as any), "should throw on unfulfilled scopes").to.throw(
            /Requested a "system\/Patient\.read" scope but none of the granted scopes \(system\/Observation\.read\) can satisfy its access requirements\./
        );

        expect(() => expectSuccessfulAuth({
            request: {
                options: {
                    form: {
                        scope: "system/*.*"
                    }
                }
            },
            headers: { "content-type": "application/json" },
            body: { access_token: "x", expires_in: 2, token_type: "bearer", scope: "system/*.read" }
        } as any), "should not throw").not.to.throw();
    })

    it ("expectFailedKickOff", () => {
        expect(() => expectFailedKickOff({
            request: { options: {} },
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: { resourceType: "y" }
        } as Response, {} as TestAPI), "should throw").to.throw(/The kick-off request was expected to fail/);
        expect(() => expectFailedKickOff({
            request: { options: {} },
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { resourceType: "y" }
        } as Response, {} as TestAPI), "should throw").to.throw(/In case of error the server should return an OperationOutcome/);
        expect(() => expectFailedKickOff({
            request: { options: {} },
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: { resourceType: "OperationOutcome" }
        } as Response, {} as TestAPI), "should not throw").not.to.throw();
    })

    it ("expectSuccessfulKickOff", () => {
        expect(() => expectSuccessfulKickOff({
            request: { options: {} },
            statusCode: 202,
            headers: {
                "content-type": "application/json"
            },
            body: {}
        } as Response, {} as TestAPI), "should throw on missing header").to.throw(
            /The kick-off response must include a content-location header/
        );
        expect(() => expectSuccessfulKickOff({
            request: { options: {} },
            statusCode: 203,
            headers: {
                "content-type": "application/json"
            },
            body: {}
        } as Response, {} as TestAPI), "should throw on bad status").to.throw();

        expect(() => expectSuccessfulKickOff({
            request: { options: {} },
            statusCode: 202,
            headers: {
                "content-type": "application/json",
                "content-location": "whatever"
            }
        } as Response, {} as TestAPI), "should not throw with no body").not.to.throw();

        expect(() => expectSuccessfulKickOff({
            request: { options: {} },
            statusCode: 202,
            headers: {
                "content-type": "application/json",
                "content-location": "whatever"
            },
            body: { resourceType: "x" }
        } as Response, {} as TestAPI), "should throw on bad resource").to.throw(
            /Unexpected resourceType/
        );

        expect(() => expectSuccessfulKickOff({
            request: { options: {} },
            statusCode: 202,
            headers: {
                "content-type": "application/json",
                "content-location": "whatever"
            },
            body: { resourceType: "OperationOutcome" }
        } as Response, {} as TestAPI), "should throw with OperationOutcome").not.to.throw();
    })

    it ("expectSuccessfulExport", () => {
        expect(() => expectSuccessfulExport({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: ""
        } as Response), "should throw with no json body").to.throw();
        expect(() => expectSuccessfulExport({
            statusCode: 400,
            headers: { "content-type": "application/json" },
            body: {}
        } as Response), "should throw on client error").to.throw();
        expect(() => expectSuccessfulExport({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: {}
        } as Response), "should not throw").not.to.throw();
    })
    
    it ("expectSuccessfulDownload", () => {
        expect(() => expectSuccessfulDownload({
            statusCode: 200,
            headers: { "content-type": "application/fhir+ndjson" },
            body: ""
        } as Response), "should throw with empty body").to.throw();
        expect(() => expectSuccessfulDownload({
            statusCode: 400,
            headers: { "content-type": "application/fhir+ndjson" },
            body: "{}\n{}"
        } as Response), "should throw on client error").to.throw();
        expect(() => expectSuccessfulDownload({
            statusCode: 200,
            headers: { "content-type": "application/fhir+ndjson" },
            body: "{}\n{}"
        } as Response), "should not throw").not.to.throw();
    })

    it ("expectExportNotEmpty", () => {
        expect(() => expectExportNotEmpty({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: {}
        } as Response), "should throw with no json body").to.throw(/The export produced no files/);
        expect(() => expectExportNotEmpty({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: { output: [] }
        } as Response), "should throw with no output").to.throw(/The export produced 0 files/);
        expect(() => expectExportNotEmpty({
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: { output: [{}] }
        } as Response), "should not throw").not.to.throw();
    })

    it ("expectNDJSONElements", () => {
        expect(() => expectNDJSONElements("{}", ["a"]), "should throw").to.throw(/Results must include 'a' property/);
        expect(() => expectNDJSONElements('{"resourceType":"x"}', ["x.b"]), "should throw for 'x.b'").to.throw(/Results must include 'x\.b' property/);
        expect(() => expectNDJSONElements('{"resourceType":"a"}', ["x.b"]), "should not throw for 'x.b'").not.to.throw();
        expect(() => expectNDJSONElements('{"resourceType":"x","b":5}', ["x.b"]), "should not throw for missing meta").to.throw(/Results must include meta element/);
        expect(() => expectNDJSONElements('{"resourceType":"x","b":5,"meta":{}}', ["x.b"]), "should not throw for missing tag").to.throw(/The meta element must have a 'tag' property/);
        expect(() => expectNDJSONElements('{"resourceType":"x","b":5,"meta":{"tag":3}}', ["x.b"]), "should not throw for bad tag").to.throw(/The 'meta\.tag' property must be an array/);
        expect(() => expectNDJSONElements('{"resourceType":"x","b":5,"meta":{"tag":[]}}',["x.b"]), "should not throw for no SUBSETTED").to.throw(/A tag with code='SUBSETTED'/);
        expect(() => expectNDJSONElements(
            '{"resourceType":"x","b":5,"meta":{"tag":[{' +
            '"system":"http://terminology.hl7.org/CodeSystem/v3-ObservationValue","code":"SUBSETTED"' +
            '}]}}',
            ["x.b"]
        ), "should not throw").not.to.throw();
    })
})
