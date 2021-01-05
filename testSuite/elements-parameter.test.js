const expect   = require("code").expect;
const {
    expectOperationOutcome,
    expectJson,
    BulkDataClient,
    getResponseError,
    NotSupportedError
} = require("./lib");


module.exports = function(describe, it, before, after, beforeEach, afterEach) {

    describe({ version: "1.5", name: "Support for the '_elements' parameter" }, () => {
        ["system", "patient", "group"].forEach(type => {
            ["GET", "POST"].forEach(method => {        
                it ({
                    id  : `_elements-01-${type}-${method}`,
                    name: `Accepts the _elements parameter through ${method} ${type}-level kick-off requests`,
                    description: "Verifies that the server starts an export if called with valid parameters. " +
                        "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                        "returned. The response body should be either empty, or a JSON OperationOutcome.",
                    before(cfg, api) { this.client = new BulkDataClient(cfg, api); },
                    after() { this.client.cancelIfStarted(); }
                }, async function (cfg, api) {

                    const resourceType = cfg.fastestResource || "Patient";

                    // The '_elements' parameter is a string of comma-delimited FHIR Elements.
                    await this.client.kickOff({
                        method,
                        type,
                        params: {
                            _elements: `id,${resourceType}.meta`,
                            _type: [resourceType]
                        }
                    });

                    // Servers unable to support _elements SHOULD return an error and
                    // OperationOutcome resource so clients can re-submit a request omitting
                    // the _elements parameter.
                    if (!this.client.kickOffResponse.headers["content-location"]) {
                        // console.log(this.client.kickOffResponse.body)
                        expectJson(
                            this.client.kickOffResponse,
                            "The body SHALL be a FHIR OperationOutcome resource in JSON format"
                        );
                        expectOperationOutcome(
                            this.client.kickOffResponse,
                            "The body SHALL be a FHIR OperationOutcome resource in JSON format"
                        );
                        return;
                    }

                    await this.client.waitForExport();
                    if (!this.client.statusResponse.body.output.length) {
                        throw new NotSupportedError("Unable to find enough data to export and complete this test");
                    }

                    const response = await this.client.downloadFileAt(0);
                    expect([200, 304], getResponseError(response)).to.include(response.statusCode);

                    // When provided, the server SHOULD omit unlisted, non-mandatory elements
                    // from the resources returned. Elements should be of the form
                    // [resource type].[element name] (eg. Patient.id) or [element name] (eg. id)
                    // and only root elements in a resource are permitted. If the resource
                    // type is omitted, the element should be returned for all resources in
                    // the response where it is applicable.
                    // Servers are not obliged to return just the requested elements. Servers
                    // SHOULD always return mandatory elements whether they are requested or
                    // not. Servers SHOULD mark the resources with the tag SUBSETTED to ensure
                    // that the incomplete resource is not actually used to overwrite a complete
                    // resource.            
                    response.body.trim().split(/\n+/).forEach(line => {
                        const res = JSON.parse(line); // console.log(res);
                        expect(res).to.contain("id");
                        expect(res).to.contain("meta");
                        expect(res.meta).to.contain("tag");
                        expect(res.meta.tag[0]).to.contain({
                            "system":"http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
                            "code":"SUBSETTED"
                        });
                    });
                });
            });
        });
    });
};
