const expect             = require("code").expect;
const { BulkDataClient } = require("./lib");


module.exports = function(describe, it, before, after, beforeEach, afterEach) {

    function createClient(cfg, api)
    {
        // Create a client to download the fastest resource.
        let pathName = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

        if (!pathName) {
            api.setNotSupported(`No export endpoints configured`);
            return null;
        }

        const resourceType = cfg.fastestResource || "Patient";
        return new BulkDataClient(cfg, api, `${cfg.baseURL}${pathName}?_type=${resourceType}`);
    }

    describe("Download Endpoint", () => {

        // let CLIENT;

        // function getClient(cfg, api)
        // {
        //     if (!CLIENT) {
        //         // Create a client to download the fastest resource.
        //         let pathName = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

        //         if (!pathName) {
        //             api.setNotSupported(`No export endpoints configured`);
        //             return null;
        //         }

        //         const resourceType = cfg.fastestResource || "Patient";
        //         CLIENT = new BulkDataClient(cfg, api, `${cfg.baseURL}${pathName}?_type=${resourceType}`);
        //     }
        //     return CLIENT;
        // }   

        // before(() => console.log(">"));
        // after(() => console.log("<"));
        // beforeEach(() => console.log(" ->"));
        // afterEach(() => console.log(" <-"));

        // Using the URIs supplied by the FHIR server in the Complete Status response body,
        // a client MAY download the generated bulk data files (one or more per resource type)
        // within the specified Expires time period. If the requiresAccessToken field in the
        // Complete Status body is set to true, the request MUST include a valid access token.
        // See the Security Considerations section above.
        // const client = new BulkDataClient()

        it ({
            id  : "Download-01",
            name: "Requires valid access token if the requiresAccessToken field in the status body is true",
            description: "If the `requiresAccessToken` field in the Complete Status body is " +
                "set to true, the request MUST include a valid access token."
        }, async (cfg, api) => {

            // Create a client to download the fastest resource.
            const client = createClient(cfg, api);
            if (client) {
                const { body } = await client.getExportResponse();
                if (body.requiresAccessToken) {
                    const response = await client.downloadFileAt(0, true);
                    expect(response.statusCode).to.be.above(399);
                } else {
                    api.decorateHTML(
                        "NOTE",
                        "<div><b>NOTE: </b> This test was not executed because the " +
                        "<code>requiresAccessToken</code> field in the complete status " +
                        "body was <b>not</b> set to <code>true</code>.</div>"
                    );
                }
            }
        });

        it ({
            id  : "Download-02",
            name: "Does not require access token if the requiresAccessToken field in the status body is not true",
            description: "Verifies that files can be downloaded without authorization if the `requiresAccessToken` field in the complete status body is not set to true"
        }, async (cfg, api) => {
            // Create a client to download the fastest resource.
            const client = createClient(cfg, api);
            if (client) {
                await client.kickOff();
                await client.waitForExport();
                if (!client.statusResponse.body.requiresAccessToken) {
                    const response = await client.downloadFileAt(0, true);
                    expect(response.statusCode).to.be.below(400);
                } else {
                    api.decorateHTML(
                        "NOTE",
                        "<div>This test was not executed because the <code>requiresAccessToken</code> field in the complete status body was set to <code>true</code>.</div>"
                    );
                }
            }
        });

        it ({
            id  : "Download-03",
            name: "Replies properly in case of error",
            description: "The server should return HTTP Status Code of 4XX or 5XX"
        }/*
            TODO: Figure out how to produce errors!
        */);

        it ({
            id  : "Download-04",
            name: "Generates valid file response",
            description: "Runs a set of assertions to verify that:\n" +
                "- The server returns HTTP status of **200 OK**.\n" +
                "- The server returns a `Content-Type` header that matches the file format being delivered. " +
                    "For files in ndjson format, MUST be `application/fhir+ndjson`.\n" +
                "- The response body is valid FHIR **ndjson** (unless other format is requested).\n" +
                "- An `Accept` header might be sent (optional, defaults to `application/fhir+ndjson`)."
        }, async (cfg, api) => {
            const client = createClient(cfg, api);
            if (client) {
                const resp = await client.downloadFileAt(0);

                expect(resp.statusCode).to.equal(200);
                expect(resp.headers["content-type"]).to.equal("application/fhir+ndjson");
                expect(resp.body).to.not.be.empty();

                const lines = resp.body.split(/\r?\n/);
                
                lines.forEach((line, i) => {
                    if (!line) {
                        api.decorateHTML("eol-warning", i === lines.length - 1 ?
                            '<div class="warning">The NDJSON file ends with new line. This could confuse some parsers.</div>' :
                            '<div class="warning">The NDJSON file contains empty lines. This could confuse some parsers.</div>'
                        , "warning");
                    } else {
                        try {
                            JSON.parse(line);
                        } catch (ex) {
                            throw new Error(`Failed to parse line ${i + 1}: ${ex.message}`);
                        }
                    }
                });
            }
        });

        it ({
            id  : "Download-05",
            name: "Rejects a download if the client scopes do not cover that resource type",
            description: "If the download endpoint requires authorization, it should also " +
                "verify that the client has been granted access to the resource type that it " +
                "attempts to download. This test makes an export and then it re-authorizes before " +
                "downloading the first file, so that the download request is made with a token " +
                "that does not provide access to the downloaded resource."
        }, async (cfg, api) => {

            if (cfg.authType == "client-credentials") {
                return api.setNotSupported(
                    `This test is not not applicable for servers using client-credentials authentication`
                );
            }

            // Create a client to download the fastest resource.
            let pathName = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

            if (!pathName) {
                return api.setNotSupported(`No export endpoints configured`);
            }

            const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${pathName}?_type=Patient`);

            // Do an export using the full access scopes
            const resp = await client.getExportResponse();

            if (!client.statusResponse.body.requiresAccessToken) {
                return api.decorateHTML(
                    "NOTE",
                    "<div>This test was not executed because the <code>requiresAccessToken</code> field in the complete status body was NOT set to <code>true</code>.</div>"
                );
            }

            // Once the export is done and before the actual download,
            // re-authorize with less scopes so that we can test if the
            // download endpoint evaluates scopes
            await client.getAccessToken({
                force        : true,
                scope        : "system/Observation.read",
                requestLabel : "Authorization Request 2",
                responseLabel: "Authorization Response 2"
            });

            const resp2 = await client.downloadFile(resp.body.output[0].url);

            expect(resp2.statusCode, "Download should fail if the client does not have proper scopes").to.be.above(399);
        });
    });

};
