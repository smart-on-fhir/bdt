const expect   = require("code").expect;
const isBase64 = require('is-base64');
const { BulkDataClient, getResponseError, request } = require("./lib");


module.exports = function(describe, it, before, after, beforeEach, afterEach) {

    describe("Download Endpoint", () => {

        
        it ({
            id  : "Download-01",
            name: "Requires valid access token if the requiresAccessToken field in the status body is true",
            description: "If the `requiresAccessToken` field in the Complete Status body is " +
                "set to true, the request MUST include a valid access token."
        }, async (cfg, api) => {
            const client = new BulkDataClient(cfg, api);
            try {
                await client.kickOff({ params: { _type: cfg.fastestResource || "Patient" }});
                const { body } = await client.getExportResponse();
                if (body.requiresAccessToken) {
                    const response = await client.downloadFileAt(0, true);
                    expect(response.statusCode, getResponseError(response)).to.be.above(399);
                } else {
                    api.decorateHTML(
                        "NOTE",
                        "<div><b>NOTE: </b> This test was not executed because the " +
                        "<code>requiresAccessToken</code> field in the complete status " +
                        "body was <b>not</b> set to <code>true</code>.</div>"
                    );
                }
            } catch (ex) {
                throw ex;
            } finally {
                await client.cancel();
            }
        });

        it ({
            id  : "Download-02",
            name: "Does not require access token if the requiresAccessToken field in the status body is not true",
            description: "Verifies that files can be downloaded without authorization if the `requiresAccessToken` field in the complete status body is not set to true"
        }, async (cfg, api) => {
            const client = new BulkDataClient(cfg, api);
            try {
                await client.kickOff({ params: { _type: cfg.fastestResource || "Patient" }});
                await client.waitForExport();
                if (!client.statusResponse.body.requiresAccessToken) {
                    const response = await client.downloadFileAt(0, true);
                    expect(response.statusCode, getResponseError(response)).to.be.below(400);
                } else {
                    api.decorateHTML(
                        "NOTE",
                        "<div>This test was not executed because the <code>requiresAccessToken</code> field in the complete status body was set to <code>true</code>.</div>"
                    );
                }
            } catch (ex) {
                throw ex;
            } finally {
                await client.cancel();
            }
        });

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
            const client = new BulkDataClient(cfg, api);
            try {
                await client.kickOff({ params: { _type: cfg.fastestResource || "Patient" }});    
                const resp = await client.downloadFileAt(0);

                expect(resp.statusCode, getResponseError(resp)).to.equal(200);
                expect(resp.headers["content-type"], getResponseError(resp)).to.equal("application/fhir+ndjson");
                expect(resp.body, getResponseError(resp)).to.not.be.empty();

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
            } catch (ex) {
                throw ex;
            } finally {
                await client.cancel();
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

            const client = new BulkDataClient(cfg, api);

            // Do an export using the full access scopes
            await client.kickOff({ params: { _type: cfg.fastestResource || "Patient" }});    
            const resp = await client.getExportResponse();

            if (!client.statusResponse.body.requiresAccessToken) {
                await client.cancel();
                return api.decorateHTML(
                    "NOTE",
                    "<div>This test was not executed because the <code>requiresAccessToken</code> field in the complete status body was NOT set to <code>true</code>.</div>"
                );
            }

            // Once the export is done and before the actual download,
            // re-authorize with other scopes so that we can test if the
            // download endpoint evaluates scopes
            try {
                await client.getAccessToken({
                    force        : true,
                    scope        : "system/Observation.read",
                    requestLabel : "Authorization Request 2",
                    responseLabel: "Authorization Response 2"
                });
            } catch (ex) {
                // perhaps authorizing with system/Observation.read was not
                // possible. In such case ignore the test instead of failing
                return api.setNotSupported(`This test is not supported because re-authorizing with "system/Observation.read" did not succeed. ${ex}`);
            }

            const resp2 = await client.downloadFile(resp.body.output[0].url);
            await client.cancel();
            expect(resp2.statusCode, `Download should fail if the client does not have proper scopes. ${getResponseError(resp2)}`).to.be.above(399);
        });

        it ({
            id  : "Download-06",
            name: "Supports binary file attachments in DocumentReference resources",
            description: "This test verifies that:\n" +
                "1. The server can export `DocumentReference` resources (if available)\n" +
                "2. If `DocumentReference` attachments contain a `data` property it should be `base64Binary`\n" +
                "3. If `DocumentReference` attachments contain an `url` property it should be an absolute url\n" +
                "4. The attachment url should be downloadable\n" +
                "5. If `requiresAccessToken` is set to true in the status response, then the attachment url " +
                "should NOT be downloadable without an access token.\n\nSee: " +
                "[https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#attachments]" +
                "(https://github.com/HL7/bulk-data/blob/master/spec/export/index.md#attachments)"
        }, async (cfg, api) => {
            
            const client = new BulkDataClient(cfg, api);

            // We don't know if the server supports DocumentReference export so
            // we just give it a try
            await client.kickOff({
                params: {
                    _type: "DocumentReference"
                }
            });

            if (client.kickOffResponse.statusCode !== 202 || !client.kickOffResponse.headers["content-location"]) {
                await client.cancel();
                return api.setNotSupported(`Unable to export DocumentReference resources. Perhaps the server does not support that.`);
            }

            try {

                // If we got here, it mans the kick-off was successful. We now have
                // to wait for the export to complete
                await client.waitForExport();

                // Inspect and validate the export response
                expect(client.statusResponse.body.output, "The output property of the status response must be an array").to.be.an.array();

                // If DocumentReference is supported but there is nothing to export
                // then we have no choice but to skip the test
                if (!client.statusResponse.body.output.length) {
                    return api.setNotSupported(`No DocumentReference resources found on this server`);
                }

                const skipAuth = !client.statusResponse.body.requiresAccessToken;

                // We do not test every single attachment! We only check one specified
                // by url and one that is inline (if any of these are found);

                // toggled to true after the first url is found
                let urlChecked = false;

                // toggled to true after the first inline attachment is found
                let inlineChecked = false;

                for (let entry of client.statusResponse.body.output) {

                    // Download each DocumentReference file
                    const resp = await client.downloadFile(entry.url, skipAuth);

                    expect(resp.statusCode, getResponseError(resp)).to.equal(200);
                    expect(resp.headers["content-type"], getResponseError(resp)).to.equal("application/fhir+ndjson");
                    expect(resp.body, getResponseError(resp)).to.not.be.empty();

                    const lines = resp.body.split(/\r?\n/);

                    for (let line of lines) {
                        // skip empty lines
                        if (!line.trim()) {
                            continue;
                        }

                        let documentReference;
                        try {
                            documentReference = JSON.parse(line);
                        } catch (ex) {
                            throw new Error(`Failed to parse DocumentReference line from NDJSON: ${ex.message}`);
                        }

                        // If resources in an output file contain elements of the type Attachment,
                        // servers SHALL populate the Attachment.contentType code as well as either
                        // the data element or the url element. The url element SHALL be an absolute
                        // url that can be de-referenced to the attachment's content.
                        let i = -1;
                        for (let item of documentReference.content) {
                            i++;
                            expect(item.attachment.contentType, "The contentType property of attachments must be specified").to.not.be.empty();

                            if (item.attachment.data && item.attachment.url) {
                                throw new Error("Either attachment.data or attachment.url should be specified, but not both.");
                            }

                            if (!item.attachment.data && !item.attachment.url) {
                                throw new Error("Either attachment.data or attachment.url should be specified.");
                            }

                            if (!inlineChecked && item.attachment.data) {
                                inlineChecked = true;
                                // verify base64Binary
                                const valid = isBase64(item.attachment.data, {
                                    allowMime      : true,
                                    mimeRequired   : false,
                                    allowEmpty     : false,
                                    paddingRequired: true
                                });
                                if (!valid) {
                                    throw new Error(
                                        `Found invalid base64Binary data at documentReference.content[${i}].attachment.data`
                                    );
                                }
                            }

                            if (!urlChecked && item.attachment.url) {

                                // verify url
                                const isAbsolute = String(item.attachment.url).search(/https?\:\/\/.+/) === 0;
                                if (!isAbsolute) {
                                    throw new Error(`The attachment url property must be an absolute URL. Found "${item.attachment.url}".`);
                                }

                                urlChecked = true;

                                // try to download the attachment
                                let file;

                                // omit authentication if the server requires it to
                                // verify that the file cannot be downloaded
                                if (!skipAuth) {
                                    let failed;
                                    try {
                                        await client.request({ url: item.attachment.url }, true);
                                        failed = false;
                                    } catch {
                                        failed = true;
                                    }
                                    if (!failed) {
                                        throw new Error(
                                            `The attachment at ${item.attachment.url} should not be downloadable without authentication.`
                                        );
                                    }
                                }

                                // now actually download it. Don't parse it though,
                                // just verify that it is downloadable
                                await request({ url: item.attachment.url }).promise();
                                // console.log(`Successfully downloaded ${item.attachment.url}`);
                            }
                        }
                    }
                }
            } catch (ex) {
                throw ex;
            } finally {
                await client.cancel();
            }
        });

        it ({
            id  : "Download-07",
            name: "Requesting deleted files returns 404 responses",
            description: "If the export has been completed, a server MAY send a DELETE request " +
                "to the status endpoint as a signal that a client is done retrieving files and " +
                "that it is safe for the sever to remove those from storage. Following the " +
                "delete request, when subsequent requests are made to the download location, " +
                "the server SHALL return a 404 error and an associated FHIR OperationOutcome in JSON format."
        }, async (cfg, api) => {
            
            const client = new BulkDataClient(cfg, api);

            if (client) {
                try {
                    await client.kickOff({ params: { _type: cfg.fastestResource || "Patient" }});

                    const resp = await client.downloadFileAt(0);

                    expect(resp.statusCode, getResponseError(resp)).to.equal(200);

                    await client.cancel();

                    let fileUrl = client.statusResponse.body.output[0].url;

                    const resp2 = await client.downloadFile(fileUrl);

                    expect(resp2.statusCode, getResponseError(resp2)).to.equal(404);
                } catch (ex) {
                    throw ex;
                } finally {
                    await client.cancel();
                }
            }
        });
    });


    describe({ version: "1.2", name: "Support for the 'patient' parameter" }, () => {

        [
            {
                idPrefix: "Patient-level",
                name    : "Patient-level export",
                type    : "patient"
            },
            {
                idPrefix: "Group-level",
                name    : "Group-level export",
                type    : "group"
            }
        ].forEach((meta, index) => {
            it ({
                id  : `patient-param-${index}`,
                name: `Supports the patient parameter via the ${meta.name} endpoint`,
                description: "Makes a normal export and then tries to make another one limited to the first patient from the result."
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                await client.kickOff({
                    type: meta.type,
                    params: {
                        _type: "Patient"
                    }
                });
                const file = await client.downloadFileAt(0);
                await client.cancel();

                const lines = file.body.split(/\r?\n/);

                let patient;
                for (let line of lines) {
                    // skip empty lines
                    if (!line.trim()) {
                        continue;
                    }

                    try {
                        patient = JSON.parse(line);
                        break;
                    } catch (ex) {
                        throw new Error(`Failed to parse Patient line from NDJSON: ${ex.message}`);
                    }
                }

                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    body: {
                        resourceType: "Parameters",
                        parameter: [
                            {
                                name : "patient",
                                valueReference : { reference: `Patient/${patient.id}` }
                            },
                            {
                                name: "_type",
                                valueString: "Patient"
                            }
                        ]
                    }
                });

                await client.waitForExport();
                const file2 = await client.downloadFile(client.statusResponse.body.output[0].url);
                await client.cancel();
                const lines2 = file2.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                expect(lines2.length, "The file should contain 1 line").to.equal(1);

                let patient2;
                try {
                    patient2 = JSON.parse(lines2[0]);
                } catch (ex) {
                    throw new Error(`Failed to parse Patient line from NDJSON: ${ex.message}`);
                }

                expect(patient2.id, `The patient ID should equal "${patient.id}"`).to.equal(patient.id);
            });
        });

        it ({
            id  : "patient-param-2",
            name: "Rejects system-level export with patient parameter",
            description: "The patient parameter is not applicable to system level export requests. " +
                "This test verifies that such invalid export attempts are being rejected."
        }, async (cfg, api) => {

            const client = new BulkDataClient(cfg, api);

            if (!(await client.getSystemExportEndpoint())) {
                api.setNotSupported(`The system-level export is not supported by this server`);
                return null;
            }

            await client.kickOff({
                method: "POST",
                type: "system",
                body: {
                    resourceType: "Parameters",
                    parameter: [
                        {
                            "name" : "patient",
                            "valueReference" : { reference: "Patient/123" }
                        },
                        {
                            "name" : "patient",
                            "valueReference" : { reference: "Patient/456" }
                        }
                    ]
                }
            });

            await client.cancelIfStarted();

            if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                return api.setNotSupported(`system-level export via POST is not supported by this server`);
            }

            if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                return api.setNotSupported(`It seems that system-level export via POST is not supported by this server`);
            }

            // Finally check that we have got an error response
            client.expectFailedKickOff();
        });
    });

    // describe("Support for the _elements parameter", () => {
    //     // string of comma-delimited FHIR Elements

    //     // When provided, the server SHOULD omit unlisted, non-mandatory elements from the resources returned.
    //     // Elements should be of the form [resource type].[element name] (eg. Patient.id) or [element name] (eg. id)
    //     // and only root elements in a resource are permitted. If the resource type is omitted, the element
    //     // should be returned for all resources in the response where it is applicable.

    //     // Servers are not obliged to return just the requested elements. Servers SHOULD always return mandatory
    //     // elements whether they are requested or not. Servers SHOULD mark the resources with the tag SUBSETTED
    //     // to ensure that the incomplete resource is not actually used to overwrite a complete resource.

    //     // "SUBSETTED|http://terminology.hl7.org/CodeSystem/v3-ObservationValue"

    //     // Servers unable to support _elements SHOULD return an error and OperationOutcome resource so clients
    //     // can re-submit a request omitting the _elements parameter.

    //     it ({
    //         id  : `_elements-01`,
    //         name: "Response - Success",
    //         description: "Verifies that the server starts an export if called with valid parameters. " +
    //             "The status code must be `202 Accepted` and a `Content-Location` header must be " +
    //             "returned. The response body should be either empty, or a JSON OperationOutcome."
    //     }, async (cfg, api) => {

    //         let pathName = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

    //         if (!pathName) {
    //             api.setNotSupported(`No export endpoints configured`);
    //             return null;
    //         }

    //         const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${pathName}`);

    //         // Set the _elements parameter some "valid" value
    //         client.url.searchParams.set("_elements", "id,resourceType");
            
    //         // Start an export
    //         await client.kickOff();

    //         // Cancel the export immediately
    //         await client.cancelIfStarted();

    //         // Verify that we didn't get an error
    //         client.expectSuccessfulKickOff();
    //     });
    // });
};
