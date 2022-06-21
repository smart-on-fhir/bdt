import moment            from "moment"
import { expect }        from "@hapi/code"
import { suite, test }   from "../lib/bdt"
import { BulkDataClient} from "../lib/BulkDataClient"
import { assert }        from "../lib/assertions";


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

        // Finally check the status code returned by the status endpoint
        assert.bulkData.status.pending(client.statusResponse, "When called immediately after kick-off, the status endpoint must reply with '202 Accepted'")
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
        assert.bulkData.status.OK(client.statusResponse, "Status response is invalid")
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

        // Make sure the kick-off was successful
        assert.bulkData.kickOff.OK(kickOffResponse, "Kick-off failed")

        // Cancel the export immediately
        const { response: cancelResponse1 } = await client.cancel(kickOffResponse);

        if (cancelResponse1.statusCode < 200 || cancelResponse1.statusCode >= 300) {
            return api.setNotSupported(`DELETE requests to the status endpoint are not supported by this server`);
        }

        assert.bulkData.cancellation.OK(cancelResponse1, "Servers that support export job canceling should reply with 202 status code");

        const { response: cancelResponse2 } = await client.request({
            url: client.kickOffResponse.headers["content-location"],
            method: "DELETE"
        });

        assert.bulkData.cancellation.notOK(
            cancelResponse2,
            "Following the delete request, when subsequent requests are " +
            "made to the polling location, the server SHALL return a 404 " +
            "error and an associated FHIR OperationOutcome in JSON format"
        );
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
                prefer: ["respond-async", "handling=lenient" ]
            },
            params: {
                [unsupportedParam]: optionalParams[unsupportedParam as keyof typeof optionalParams],
                _since
            }
        });

        // console.log(client.kickOffResponse.body)

        assert.bulkData.kickOff.OK(response, "Kick-off failed");

        await client.waitForExport();
        await client.cancel(response);

        const outcomes = (client.statusResponse.body.error || []).filter((x:any) => x.resourceType === "OperationOutcome");

        expect(outcomes.length, "No OperationOutcome errors found in the errors array").to.be.greaterThan(0);
        expect(JSON.stringify(outcomes), `"${unsupportedParam}" should be mentioned in at least one of the OperationOutcome errors`).to.contain(unsupportedParam);
    });

})
