"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const code_1 = require("@hapi/code");
const is_base64_1 = __importDefault(require("is-base64"));
const BulkDataClient_1 = require("../lib/BulkDataClient");
const lib_1 = require("../lib/lib");
const assertions_1 = require("../lib/assertions");
suite("Download Endpoint", () => {
    test({
        name: "Requires valid access token if the requiresAccessToken field in the status body is true",
        description: "If the `requiresAccessToken` field in the Complete Status body is " +
            "set to true, the request MUST include a valid access token."
    }, async ({ config, api }) => {
        const client = new BulkDataClient_1.BulkDataClient(config, api);
        let kickOffResponse;
        try {
            kickOffResponse = (await client.kickOff({ params: { _type: [config.fastestResource] } })).response;
            const { body } = await client.getExportResponse();
            if (body.requiresAccessToken) {
                const response = await client.downloadFileAt(0, true);
                code_1.expect(response.statusCode, lib_1.getErrorMessageFromResponse(response)).to.be.above(399);
            }
            else {
                api.console.md("This test was not executed because the " +
                    "`requiresAccessToken` field in the complete status " +
                    "body was **not** set to `true`.", "info", "NOTE");
            }
        }
        catch (ex) {
            throw ex;
        }
        finally {
            await client.cancelIfStarted(kickOffResponse);
        }
    });
    test({
        name: "Does not require access token if the requiresAccessToken field in the status body is not true",
        description: "Verifies that files can be downloaded without authorization if the `requiresAccessToken` field in the complete status body is not set to true"
    }, async ({ config, api }) => {
        const client = new BulkDataClient_1.BulkDataClient(config, api);
        let kickOffResponse;
        try {
            kickOffResponse = (await client.kickOff({ params: { _type: [config.fastestResource] } })).response;
            await client.waitForExport();
            if (!client.statusResponse.body.requiresAccessToken) {
                const response = await client.downloadFileAt(0, true);
                code_1.expect(response.statusCode, "Downloading a file without authorization").to.be.below(400);
            }
            else {
                api.console.md("This test was not executed because the `requiresAccessToken` field in the complete status body was set to `true`.", "info", "NOTE");
            }
        }
        catch (ex) {
            throw ex;
        }
        finally {
            if (kickOffResponse) {
                await client.cancel(kickOffResponse);
            }
        }
    });
    test({
        name: "Generates valid file response",
        description: "Runs a set of assertions to verify that:\n" +
            "- The server returns HTTP status of **200 OK**.\n" +
            "- The server returns a `Content-Type` header that matches the file format being delivered. " +
            "For files in ndjson format, MUST be `application/fhir+ndjson`.\n" +
            "- The response body is valid FHIR **ndjson** (unless other format is requested).\n" +
            "- An `Accept` header might be sent (optional, defaults to `application/fhir+ndjson`)."
    }, async ({ config, api }) => {
        const client = new BulkDataClient_1.BulkDataClient(config, api);
        let kickOffResponse;
        try {
            kickOffResponse = (await client.kickOff({ params: { _type: [config.fastestResource] } })).response;
            const resp = await client.downloadFileAt(0, client.statusResponse.body.requiresAccessToken === false);
            assertions_1.expectSuccessfulDownload(resp, "Download failed");
            // expect(resp.statusCode, getResponseError(resp)).to.equal(200);
            // expect(resp.headers["content-type"], getResponseError(resp)).to.equal("application/fhir+ndjson");
            // expect(resp.body, getResponseError(resp)).to.not.be.empty();
            const lines = resp.body.split(/\r?\n/);
            lines.forEach((line, i) => {
                if (!line) {
                    api.console.warn(i === lines.length - 1 ?
                        'The NDJSON file ends with new line. This could confuse some parsers.' :
                        'The NDJSON file contains empty lines. This could confuse some parsers.');
                }
                else {
                    try {
                        JSON.parse(line);
                    }
                    catch (ex) {
                        throw new Error(`Failed to parse line ${i + 1}: ${ex.message}`);
                    }
                }
            });
        }
        catch (ex) {
            throw ex;
        }
        finally {
            if (kickOffResponse) {
                await client.cancel(kickOffResponse);
            }
        }
    });
    test({
        name: "Rejects a download if the client scopes do not cover that resource type",
        description: "If the download endpoint requires authorization, it should also " +
            "verify that the client has been granted access to the resource type that it " +
            "attempts to download. This test makes an export and then it re-authorizes before " +
            "downloading the first file, so that the download request is made with a token " +
            "that does not provide access to the downloaded resource."
    }, async ({ config, api }) => {
        api.prerequisite({
            assertion: config.authentication.type == "backend-services",
            message: "This test is only applicable for servers using SMART Backend Services authentication"
        });
        const client = new BulkDataClient_1.BulkDataClient(config, api);
        // Do an export using the full access scopes
        const { response } = await client.kickOff({ params: { _type: [config.fastestResource] } });
        assertions_1.expectSuccessfulKickOff(response, "Export failed");
        const resp = await client.getExportResponse();
        if (!client.statusResponse.body.requiresAccessToken) {
            await client.cancel(response);
            return api.console.md("This test was not executed because the `requiresAccessToken` field in the complete status body was NOT set to `true`.", "info", "NOTE");
        }
        // Once the export is done and before the actual download,
        // re-authorize with other scopes so that we can test if the
        // download endpoint evaluates scopes
        let newToken;
        try {
            newToken = await client.authorize({
                scope: "system/Observation.read",
                requestLabel: "Authorization Request 2",
                responseLabel: "Authorization Response 2"
            });
        }
        catch (ex) {
            // perhaps authorizing with system/Observation.read was not
            // possible. In such case ignore the test instead of failing
            return api.setNotSupported(`This test is not supported because re-authorizing with "system/Observation.read" did not succeed. ${ex}`);
        }
        const resp2 = await client.downloadFile(resp.body.output[0].url, {
            headers: {
                authorization: `Bearer ${newToken}`
            }
        });
        await client.cancelIfStarted(response);
        code_1.expect(resp2.statusCode, `Download should fail if the client does not have proper scopes. ${lib_1.getErrorMessageFromResponse(resp2)}`).to.be.above(399);
    });
    test({
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
    }, async ({ config, api }) => {
        const client = new BulkDataClient_1.BulkDataClient(config, api);
        // We don't know if the server supports DocumentReference export so
        // we just give it a try
        const { response: kickOffResponse } = await client.kickOff({ params: { _type: ["DocumentReference"] } });
        if (client.kickOffResponse.statusCode !== 202 || !client.kickOffResponse.headers["content-location"]) {
            await client.cancelIfStarted(kickOffResponse);
            return api.setNotSupported(`Unable to export DocumentReference resources. Perhaps the server does not support that.`);
        }
        try {
            // If we got here, it mans the kick-off was successful. We now have
            // to wait for the export to complete
            await client.waitForExport();
            assertions_1.expectSuccessfulExport(client.statusResponse, "Export was not successful");
            // Inspect and validate the export response
            code_1.expect(client.statusResponse.body.output, "The output property of the status response must be an array").to.be.an.array();
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
                const resp = await client.downloadFile(entry.url, { skipAuth });
                assertions_1.expectSuccessfulDownload(resp, `Failed to download file from ${entry.url}`);
                const lines = resp.body.split(/\r?\n/);
                let lineNumber = 0;
                for (let line of lines) {
                    lineNumber += 1;
                    // skip empty lines
                    if (!line.trim()) {
                        continue;
                    }
                    let documentReference;
                    try {
                        documentReference = JSON.parse(line);
                    }
                    catch (ex) {
                        throw new Error(`Failed to parse DocumentReference line ${lineNumber} from NDJSON: ${ex.message}`);
                    }
                    // If resources in an output file contain elements of the type Attachment,
                    // servers SHALL populate the Attachment.contentType code as well as either
                    // the data element or the url element. The url element SHALL be an absolute
                    // url that can be de-referenced to the attachment's content.
                    let i = -1;
                    for (let item of documentReference.content) {
                        i++;
                        code_1.expect(item.attachment.contentType, "The contentType property of attachments must be specified").to.not.be.empty();
                        if (item.attachment.data && item.attachment.url) {
                            throw new Error("Either attachment.data or attachment.url should be specified, but not both.");
                        }
                        if (!item.attachment.data && !item.attachment.url) {
                            throw new Error("Either attachment.data or attachment.url should be specified.");
                        }
                        if (!inlineChecked && item.attachment.data) {
                            inlineChecked = true;
                            // verify base64Binary
                            const valid = is_base64_1.default(item.attachment.data, {
                                allowMime: true,
                                mimeRequired: false,
                                allowEmpty: false,
                                paddingRequired: true
                            });
                            if (!valid) {
                                throw new Error(`Found invalid base64Binary data at documentReference.content[${i}].attachment.data`);
                            }
                        }
                        if (!urlChecked && item.attachment.url) {
                            // verify url
                            const isAbsolute = String(item.attachment.url).search(/https?\:\/\/.+/) === 0;
                            if (!isAbsolute) {
                                throw new Error(`The attachment url property must be an absolute URL. Found "${item.attachment.url}".`);
                            }
                            urlChecked = true;
                            // omit authentication if the server requires it to
                            // verify that the file cannot be downloaded
                            if (!skipAuth) {
                                const { response } = await client.request({ url: item.attachment.url, skipAuth: true });
                                code_1.expect(response.statusCode, `The attachment at ${item.attachment.url} should not be downloadable without authentication`).to.be.above(399);
                                code_1.expect([400, 401, 403], `The rejects the download but replies with unexpected status code "${response.statusCode}"`).to.include(response.statusCode);
                            }
                            // now actually download it. Don't parse it though, just verify that it is downloadable
                            const { response } = await client.request({ url: item.attachment.url });
                            code_1.expect([200, 304], `The file at  at ${item.attachment.url} cannot be download`).to.include(response.statusCode);
                        }
                    }
                }
            }
        }
        catch (ex) {
            throw ex;
        }
        finally {
            await client.cancel(kickOffResponse);
        }
    });
    test({
        name: "Requesting deleted files returns 404 responses",
        description: "After a bulk data request has been started, a client **MAY** " +
            "send a **DELETE** request to the URL provided in the `Content-Location` " +
            "header to cancel the request as described in the [FHIR Asynchronous " +
            "Request Pattern](https://www.hl7.org/fhir/R4/async.html). If the " +
            "request has been completed, a server **MAY** use the request as a signal " +
            "that a client is done retrieving files and that it is safe for the " +
            "sever to remove those from storage. Following the delete request, " +
            "when subsequent requests are made to the polling location, the server " +
            "**SHALL return a 404** error and an associated FHIR OperationOutcome " +
            "in JSON format."
    }, async ({ config, api }) => {
        const client = new BulkDataClient_1.BulkDataClient(config, api);
        let kickOffResponse;
        try {
            kickOffResponse = (await client.kickOff({ params: { _type: [config.fastestResource] } })).response;
            const resp = await client.downloadFileAt(0, client.statusResponse.body.requiresAccessToken === false);
            assertions_1.expectSuccessfulDownload(resp, "Download failed");
            await client.cancel(kickOffResponse);
            let fileUrl = client.statusResponse.body.output[0].url;
            const resp2 = await client.downloadFile(fileUrl);
            assertions_1.expectResponseCode(resp2, 404, "Files remain accessible after the export is deleted. " +
                "Requesting them should return a 404 status code but we got " +
                resp2.statusCode + " " + resp2.statusMessage + ".");
        }
        catch (ex) {
            throw ex;
        }
        finally {
            await client.cancelIfStarted(kickOffResponse);
        }
    });
});
//# sourceMappingURL=download.test.js.map