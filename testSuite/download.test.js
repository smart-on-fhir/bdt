const expect   = require("code").expect;
const isBase64 = require('is-base64');
const { BulkDataClient, getResponseError, request } = require("./lib");


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

    describe({ version: "1.2", name: "Download Endpoint" }, () => {

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
                try {
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
                try {
                    await client.kickOff();
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
            const client = createClient(cfg, api);
            if (client) {
                try {
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
            
            let pathName = cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint;

            if (!pathName) {
                api.setNotSupported(`No export endpoints configured`);
                return null;
            }

            const client = createClient(cfg, api);
            if (client) {
                try {
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
};
