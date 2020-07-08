const expect           = require("code").expect;
const moment           = require("moment");
const {
    BulkDataClient,
    expectStatusCode
} = require("./lib");


const REGEXP_INSTANT = new RegExp(
    "([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)-" +
    "(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])T([01][0-9]|2[0-3])" +
    ":[0-5][0-9]:([0-5][0-9]|60)(\\.[0-9]+)?(Z|(\\+|-)((0[0-9]|1[0-3])" +
    ":[0-5][0-9]|14:00))"
);

module.exports = function(describe, it) {

    describe("Status Endpoint", () => {

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

        it ({
            id  : "Status-01",
            name: "Responds with 202 for active transaction IDs",
            description: "The status endpoint should return **202** status code until the export is completed.\n\n" +
                'See [https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#response---in-progress-status]' +
                '(https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#response---in-progress-status).'
        }, async (cfg, api) => {

            // Create a client that would export patients (or whatever the
            // fastest resource is) modified since the last month
            const resourceType = cfg.fastestResource || "Patient";
            const endPoint = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

            if (!endPoint) {
                return api.setNotSupported(`No export endpoints defined in configuration`);
            }

            const url = `${cfg.baseURL}${endPoint}?_type=${resourceType}`;
            const client = new BulkDataClient(cfg, api, url);
            client.url.searchParams.set(cfg.sinceParam || "_since", moment().subtract(1, "months").format("YYYY-MM-DDTHH:mm:ssZ"));

            // Start an export
            await client.kickOff();

            // Not that the export should have been started, call the status
            // endpoint to capture it's response
            await client.status();

            // Then make sure we cancel that export
            await client.cancel();

            // Finally check the status code returned by the status endpoint
            expectStatusCode(client.statusResponse, 202, "the status code returned by the status endpoint must be 202");
        });

        it ({
            id  : "Status-02",
            name: "Replies properly in case of error",
            description: "Runs a set of assertions to verify that:\n" +
                "- The returned HTTP status code is 5XX\n" +
                "- The server returns a FHIR OperationOutcome resource in JSON format\n\n" +
                "Note that even if some of the requested resources cannot successfully be exported, " +
                "the overall export operation MAY still succeed. In this case, " +
                "the Response.error array of the completion response MUST be populated " +
                "(see below) with one or more files in ndjson format containing " +
                "FHIR OperationOutcome resources to indicate what went wrong.\n" +
                'See [https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#response---error-status-1]' +
                '(https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#response---error-status-1).'
        }/*
            TODO: Figure out how to produce errors!
        */);

        it ({
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
        }, async (cfg, api) => {

            // Create a client that would export patients (or whatever the
            // fastest resource is) modified in the last month
            const resourceType = cfg.fastestResource || "Patient";
            const endPoint = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

            if (!endPoint) {
                return api.setNotSupported(`No export endpoints defined in configuration`);
            }

            const url = `${cfg.baseURL}${endPoint}?_type=${resourceType}`;
            const client = new BulkDataClient(cfg, api, url);

            // Do an actual export (except that we do not download files here)
            await client.kickOff();
            await client.waitForExport();
            await client.cancel(); // just in case

            const body = client.statusResponse.body;

            expect(client.statusResponse.statusCode, "Responds with 200 for completed transactions").to.equal(200);

            expect(client.statusResponse.headers["content-type"], "responds with JSON").to.match(/^application\/json/i);

            // The server MAY return an Expires header indicating when the files listed will no longer be available.
            if (client.statusResponse.headers["expires"]) {
                expect(client.statusResponse.headers["expires"], "the expires header must be a string if present").to.be.a.string();
                expect(moment(client.statusResponse.headers["expires"]).diff(moment(), "seconds") > 0).to.be.true();
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
            expect(body.request, "the 'request' property must contain the kick-off URL").to.equal(client.url.href);

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

    });

};
