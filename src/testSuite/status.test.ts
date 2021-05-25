import moment            from "moment"
import { expect }        from "@hapi/code"
import { suite, test }   from "../lib/bdt"
import { BulkDataClient} from "../lib/BulkDataClient"
import {
    expectOperationOutcome,
    expectSuccessfulKickOff
} from "../lib/assertions";



const REGEXP_INSTANT = new RegExp(
    "([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-" +
    "(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3])" +
    ":[0-5][0-9]:([0-5][0-9]|60)(\\.[0-9]+)?(Z|(\\+|-)((0[0-9]|1[0-3])" +
    ":[0-5][0-9]|14:00))"
);


suite("Status Endpoint", () => {

    // After a bulk data request has been started, the client MAY poll the
    // URI provided in the Content-Location header.

    // Note: Clients SHOULD follow an exponential back-off approach when
    // polling for status. Servers SHOULD supply a Retry-After header with
    // a http date or a delay time in seconds. When provided, clients SHOULD
    // use this information to inform the timing of future polling requests.
    // Servers SHOULD keep an accounting of status queries received from a
    // given client, and if a client is polling too frequently, the server
    // SHOULD respond with a 429 Too Many Requests status code in addition
    // to a Retry-After header, and optionally a FHIR OperationOutcome
    // resource with further explanation. If excessively frequent status
    // queries persist, the server MAY return a 429 Too Many Requests status
    // code and terminate the session.

    // Note: When requesting status, the client SHOULD use an Accept header
    // for indicating content type application/json. In the case that errors
    // prevent the export from completing, the server SHOULD respond with a
    // JSON-encoded FHIR OperationOutcome resource.

    test({
        name: "Responds with 202 for active exports",
        description: "The status endpoint should return **202** status code until the export is completed.\n\n" +
            'See [Response in progress status]' +
            '(https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#response---in-progress-status).'
    }, async ({ config, api }) => {

        const client = new BulkDataClient(config, api)

        // Start an export
        const { response: kickOffResponse } = await client.kickOff({
            params: {
                _type : config.fastestResource,
                _since: moment().subtract(1, "day").format("YYYY-MM-DDTHH:mm:ssZ")
            }
        });

        // Note that the export should have been started, call the status
        // endpoint to capture it's response
        await client.status();

        // Then make sure we cancel that export
        await client.cancel(kickOffResponse);

        // // Finally check the status code returned by the status endpoint
        expect(client.statusResponse.statusCode, "The status code returned by the status endpoint must be 202").to.equal(202)
    });

    test({
        id  : "Status-03",
        name: "Generates valid status response",
        description: "Runs a set of assertions to verify that:\n" +
            "- The status endpoint should return **200** status code when the export is completed\n" +
            "- The status endpoint should respond with **JSON**\n" +
            "- The `expires` header (if set) must be valid date in the future\n" +
            "- The JSON response contains `transactionTime` which is a valid [FHIR instant](http://hl7.org/fhir/datatypes.html#instant)\n" +
            "- The JSON response contains the kick-off URL in `request` property\n" +
            "- The JSON response contains `requiresAccessToken` boolean property\n" +
            "- The JSON response contains an `output` array in which:\n" +
            "    - Every item has valid `type` property\n" +
            "    - Every item has valid `url` property\n" +
            "    - Every item may a `count` number property\n" +
            "- The JSON response contains an `error` array in which:\n" +
            "    - Every item has valid `type` property\n" +
            "    - Every item has valid `url` property\n" +
            "    - Every item may a `count` number property\n"
    }, async ({ config, api }) => {

        const client = new BulkDataClient(config, api)

        const resourceType = config.fastestResource;
        
        const { response: kickOffResponse } =await client.kickOff({ params: { _type: resourceType } });
        await client.waitForExport();
        await client.cancel(kickOffResponse);

        const body = client.statusResponse.body;

        expect(client.statusResponse.statusCode, "Responds with 200 for completed exports").to.equal(200);

        expect(client.statusResponse.headers["content-type"], "responds with JSON").to.match(/^application\/json/i);

        // The server MAY return an Expires header indicating when the files listed will no longer be available.
        if (client.statusResponse.headers["expires"]) {
            
            expect(client.statusResponse.headers["expires"], "the expires header must be a string if present").to.be.a.string();

            // If expires header is present, make sure it is in the future.
            const expires = moment(client.statusResponse.headers["expires"], [

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
            ]).utc(true);

            const now = moment().utc(true);
            expect(expires.diff(now, "seconds") > 0, "The expires header of the status response should be a date in the future").to.be.true();

            // Note that the above assertion might be unreliable due to small time differences between
            // the host machine that executes the tests and the server. For that reason we also check if
            // the server returns a "time" header and if so, we verify that "expires" is after "time".
            if (client.statusResponse.headers["date"]) {
                const date = moment(client.statusResponse.headers["date"]).utc(true);
                expect(expires.diff(date, "seconds") > 0, "The expires header of the status response should be a date after the one in the date header").to.be.true();
            }
        }

        // transactionTime - a FHIR instant type that indicates the server's time when the query is run.
        // The response SHOULD NOT include any resources modified after this instant, and SHALL include
        // any matching resources modified up to (and including) this instant. Note: to properly meet
        // these constraints, a FHIR Server might need to wait for any pending transactions to resolve
        // in its database, before starting the export process.
        expect(body, "the response contains 'transactionTime'").to.include("transactionTime");
        expect(body.transactionTime, "transactionTime must be a string").to.be.a.string();
        expect(body.transactionTime, "transactionTime must be FHIR instant").to.match(REGEXP_INSTANT);

        // the full URI of the original bulk data kick-off request
        expect(body, "the response contains 'request'").to.include("request");
        expect(body.request, "the 'request' property must contain the kick-off URL").to.equal(client.kickOffRequest.options.url.href);

        // requiresAccessToken - boolean value of true or false indicating whether downloading the generated
        // files requires a bearer access token. Value MUST be true if both the file server and the FHIR API
        // server control access using OAuth 2.0 bearer tokens. Value MAY be false for file servers that use
        // access-control schemes other than OAuth 2.0, such as downloads from Amazon S3 bucket URIs or
        // verifiable file servers within an organization's firewall.
        expect(body, "the response contains 'requiresAccessToken'").to.include("request");
        expect(body.requiresAccessToken, "the 'requiresAccessToken' property must have a boolean value").to.be.boolean();

        // array of bulk data file items with one entry for each generated
        // file. Note: If no resources are returned from the kick-off
        // request, the server SHOULD return an empty array.
        expect(body, "the response contains an 'output' array").to.include("output");
        expect(body.output, "the 'output' property must be an array").to.be.an.array();

        body.output.forEach(item => {

            // type - the FHIR resource type that is contained in the file. Note: Each file MUST contain
            // resources of only one type, but a server MAY create more than one file for each resource
            // type returned. The number of resources contained in a file MAY vary between servers. If no
            // data are found for a resource, the server SHOULD NOT return an output item for that resource
            // in the response.
            expect(item, "every output item must have 'type' property").to.include("type");
            expect(item.type, "every output item's 'type' property must equal the exported resource type").to.include(resourceType);
            
            // url - the path to the file. The format of the file SHOULD reflect that requested in the
            // _outputFormat parameter of the initial kick-off request. Note that the files-for-download
            // MAY be served by a file server other than a FHIR-specific server.
            expect(item, "every output item must have 'url' property").to.include("url");
            expect(item.url, "every output item url must be a string").to.be.a.string();
            
            // Each file item MAY optionally contain the following field:
            if (item.hasOwnProperty("count")) {
                // count - the number of resources in the file, represented as a JSON number.
                expect(item.count, "if set, output item count must be a number").to.be.a.number();
            }
        });

        // array of error file items following the same structure as the
        // output array. Note: If no errors occurred, the server SHOULD
        // return an empty array. Note: Only the OperationOutcome resource
        // type is currently supported, so a server MUST generate files in
        // the same format as the bulk data output files that contain
        // OperationOutcome resources.
        expect(body, "the response contains an 'error' array").to.include("error");
        expect(body.output, "the 'error' property must be an array").to.be.an.array();

        body.error.forEach(item => {
            // type - the FHIR resource type that is contained in the file. Note: Each file MUST contain
            // resources of only one type, but a server MAY create more than one file for each resource
            // type returned. The number of resources contained in a file MAY vary between servers. If no
            // data are found for a resource, the server SHOULD NOT return an output item for that resource
            // in the response.
            expect(item, "every error item must have 'type' property").to.include("error");
            expect(item.type, "every error item's 'type' property must equal the exported resource type").to.include(resourceType);
            
            // url - the path to the file. The format of the file SHOULD reflect that requested in the
            // _outputFormat parameter of the initial kick-off request. Note that the files-for-download
            // MAY be served by a file server other than a FHIR-specific server.
            expect(item, "every error item must have 'url' property").to.include("url");
            expect(item.url, "every error item url must be a string").to.be.a.string();
            
            // Each file item MAY optionally contain the following field:
            if (item.hasOwnProperty("count")) {
                // count - the number of resources in the file, represented as a JSON number.
                expect(item.count, "if set, error item count must be a number").to.be.a.number();
            }
        });
    });

    test({
        name: "Exports can be canceled",
        description: "After a bulk data request has been started, a client MAY send a **DELETE** " +
            "request to the URL provided in the `Content-Location` header to cancel the request. " +
            "Following the delete request, when subsequent requests are made to the polling location, " +
            "the server SHALL return a 404 error and an associated FHIR OperationOutcome in JSON format."
    }, async ({ config, api }) => {

        const client = new BulkDataClient(config, api)
        
        // Start an export
        const { response: kickOffResponse } = await client.kickOff();

        // Cancel the export immediately
        const { response: cancelResponse1 } = await client.cancel(kickOffResponse);

        // Verify that we didn't get an error
        expectSuccessfulKickOff(kickOffResponse, api);

        if (cancelResponse1.statusCode < 200 || cancelResponse1.statusCode >= 300) {
            return api.setNotSupported(`DELETE requests to the status endpoint are not supported by this server`);
        }

        expect(cancelResponse1.statusCode, "Servers that support export job canceling should reply with 202 status code").to.equal(202);

        const { response: cancelResponse2 } = await client.request({
            url   : client.kickOffResponse.headers["content-location"],
            method: "DELETE"
        });

        const msg = "Following the delete request, when subsequent requests are " +
            "made to the polling location, the server SHALL return a 404 " +
            "error and an associated FHIR OperationOutcome in JSON format";
        expect(cancelResponse2.statusCode, msg).to.equal(404);
        expectOperationOutcome(cancelResponse2, msg);
    });

    test({
        name: "Includes lenient errors in the payload errors array",
        minVersion: "1.2",
        description: "If the request contained invalid or unsupported parameters " +
            "along with a `Prefer: handling=lenient` header and the server " +
            "processed the request, the server SHOULD include an OperationOutcome " +
            "resource for each of these parameters."
    }, async ({ config, api }) => {

        const client = new BulkDataClient(config, api)

        // use a recent data to reduce the possible payload size
        const _since = moment().subtract(1, "day").format("YYYY-MM-DDTHH:mm:ssZ");

        // To properly execute this test we need to find at least one optional
        // parameter that is not supported by this server
        const optionalParams = {
            _typeFilter           : "Patient?status=active",
            includeAssociatedData : "LatestProvenanceResources",
            _elements             : "id",
            patient               : ["test-patient-id"],
            _type                 : ["Patient"]
        };

        let unsupportedParam;

        for (const param of Object.keys(optionalParams)) {
            const { response } = await client.kickOff({
                method: param === "patient" ? "POST" : "GET",
                type  : param === "patient" ? "patient" : null,
                params: {
                    [param]: optionalParams[param as keyof typeof optionalParams],
                    _since
                }
            });

            await client.cancelIfStarted(response);
            if (client.kickOffResponse.statusCode >= 400 && client.kickOffResponse.statusCode < 500) {
                unsupportedParam = param;
                break;
            }
        }

        // If all the optional params are supported there is nothing more we can do!
        if (!unsupportedParam) {
            return;
        }
        
        // Kick-off with that unsupported param and handling=lenient
        const { response } = await client.kickOff({
            method : unsupportedParam === "patient" ? "POST" : "GET",
            type   : unsupportedParam === "patient" ? "patient" : null,
            headers: {
                prefer: "respond-async,handling=lenient"
            },
            params: {
                [unsupportedParam]: optionalParams[unsupportedParam as keyof typeof optionalParams],
                _since
            }
        });

        // console.log(client.kickOffResponse.body)

        expectSuccessfulKickOff(response, api, "Kick-off failed");

        await client.waitForExport();
        await client.cancel(response);

        const outcomes = (client.statusResponse.body.error || []).filter((x:any) => x.resourceType === "OperationOutcome");

        expect(outcomes.length, "No OperationOutcome errors found in the errors array").to.be.greaterThan(0);
        expect(JSON.stringify(outcomes), `"${unsupportedParam}" should be mentioned in at least one of the OperationOutcome errors`).to.contain(unsupportedParam);
    });

})
