"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const code_1 = require("@hapi/code");
const BulkDataClient_1 = require("../lib/BulkDataClient");
const assertions_1 = require("../lib/assertions");
suite("Kick-off Endpoint", () => {
    ["patient", "system", "group"].forEach((type) => {
        suite(`Making a ${type}-level export`, () => {
            suite("Request Headers", () => {
                // Accept ------------------------------------------------------
                test({
                    name: "Requires Accept header",
                    description: 'The Accept header specifies the format of the optional ' +
                        'OperationOutcome response to the kick-off request. Currently, ' +
                        'only `application/fhir+json` is supported. This test makes an ' +
                        'otherwise valid kick-off GET request but omits the `accept` ' +
                        'header and expects the server to reject it.'
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // By default the kickOff method will do a proper request to the
                    // kick-off endpoint, including accept and prefer headers.
                    // We need to remove the accept header for this test.
                    const { response } = await client.kickOff({
                        type,
                        // Remove the "accept: application/fhir+json" header
                        headers: { accept: undefined }
                    });
                    // If the server did not return an error as expected, an export
                    // might have been started. Make sure we cancel that!
                    await client.cancelIfStarted(response);
                    // Finally check that we have got an error response
                    assertions_1.expectFailedKickOff(response, "The accept header is not required");
                });
                test({
                    name: "Requires Accept header in POST requests",
                    minVersion: "2",
                    description: 'The Accept header specifies the format of the optional ' +
                        'OperationOutcome response to the kick-off request. Currently, ' +
                        'only `application/fhir+json` is supported. This test makes an ' +
                        'otherwise valid kick-off POST request but omits the `accept` ' +
                        'header and expects the server to reject it.'
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // By default the kickOff method will do a proper request to the
                    // kick-off endpoint, including accept and prefer headers.
                    // We need to remove the accept header for this test.
                    const { response } = await client.kickOff({
                        method: "POST",
                        type,
                        // Remove the "accept: application/fhir+json" header
                        headers: { accept: undefined }
                    });
                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted(response);
                    // Finally check that we have got an error response
                    assertions_1.expectFailedKickOff(response, "The accept header is not required");
                });
                // Prefer ------------------------------------------------------
                test({
                    name: "Requires the Prefer header to contain respond-async",
                    description: 'The **Prefer** request header is required and specifies ' +
                        'whether the response is immediate or asynchronous. ' +
                        'The header MUST be set to **respond-async**. ' +
                        '[Red More](https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers).'
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // By default the kickOff method will do a proper request to the
                    // kick-off endpoint, including accept and prefer headers.
                    // We need to remove the accept header for this test.
                    const { response } = await client.kickOff({
                        type,
                        // Remove the "prefer: respond-async" header
                        headers: { prefer: undefined }
                    });
                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted(response);
                    // Finally check that we have got an error response
                    assertions_1.expectFailedKickOff(response, "The prefer header is not validated");
                });
                test({
                    name: "Requires the Prefer header to contain respond-async in POST requests",
                    minVersion: "2",
                    description: 'The **Prefer** request header is required and specifies ' +
                        'whether the response is immediate or asynchronous. ' +
                        'The header MUST be set to **respond-async**. ' +
                        '[Red More](https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers).'
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // By default the kickOff method will do a proper request to the
                    // kick-off endpoint, including accept and prefer headers.
                    // We need to remove the accept header for this test.
                    const { response } = await client.kickOff({
                        method: "POST",
                        type,
                        // Remove the "prefer: respond-async" header
                        headers: { prefer: undefined }
                    });
                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted(response);
                    // Finally check that we have got an error response
                    assertions_1.expectFailedKickOff(response, "The prefer header is not validated");
                });
                test({
                    name: 'Allows the Prefer header to contain "handling=lenient"',
                    minVersion: "2"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // By default the kickOff method will do a proper request to the
                    // kick-off endpoint, including accept and prefer headers.
                    // We need to remove the accept header for this test.
                    const { response } = await client.kickOff({
                        type,
                        params: { _type: [config.fastestResource] },
                        headers: { prefer: "respond-async, handling=lenient" }
                    });
                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted(response);
                    // Finally check that we have got an error response
                    assertions_1.expectSuccessfulKickOff(response, "The 'handling=lenient' portion of the Prefer header is not supported");
                });
            });
            suite("Request Parameters", () => {
                // _outputFormat -----------------------------------------------
                ([
                    "application/fhir+ndjson",
                    "application/ndjson",
                    "ndjson"
                ].forEach(_outputFormat => {
                    test({
                        name: `Accepts _outputFormat=${_outputFormat}`,
                        description: `Verifies that the server accepts \`${_outputFormat}\` as **_outputFormat** parameter`
                    }, async ({ config, api }) => {
                        const client = new BulkDataClient_1.BulkDataClient(config, api);
                        const { response } = await client.kickOff({ type, params: { _outputFormat } });
                        await client.cancelIfStarted(response);
                        assertions_1.expectSuccessfulKickOff(response, `The _outputFormat parameter does not support "${_outputFormat}" value`);
                    });
                    test({
                        name: `Accepts _outputFormat=${_outputFormat} in POST requests`,
                        minVersion: "2",
                        description: `Verifies that the server accepts \`${_outputFormat}\` as **_outputFormat** parameter`
                    }, async ({ config, api }) => {
                        const client = new BulkDataClient_1.BulkDataClient(config, api);
                        const { response } = await client.kickOff({ method: "POST", type, params: { _outputFormat } });
                        await client.cancelIfStarted(response);
                        assertions_1.expectSuccessfulKickOff(response, `The _outputFormat parameter does not support "${_outputFormat}" value`);
                    });
                }));
                ([
                    "application/xml",
                    "text/html",
                    "x-custom"
                ].forEach(_outputFormat => {
                    test({
                        name: `Rejects unsupported format "_outputFormat=${_outputFormat}"`,
                        description: `This tests if the server rejects \`_outputFormat=${_outputFormat}\` ` +
                            `parameter, even though \`${_outputFormat}\` is valid mime type.`
                    }, async ({ config, api }) => {
                        const client = new BulkDataClient_1.BulkDataClient(config, api);
                        const { response } = await client.kickOff({ type, params: { _outputFormat } });
                        await client.cancelIfStarted(response);
                        assertions_1.expectFailedKickOff(response, `Parameter "_outputFormat=${_outputFormat}" was not rejected`);
                    });
                    test({
                        minVersion: "2",
                        name: `Rejects unsupported format "_outputFormat=${_outputFormat}" in POST requests`,
                        description: `This tests if the server rejects \`_outputFormat=${_outputFormat}\` ` +
                            `parameter, even though \`${_outputFormat}\` is valid mime type.`
                    }, async ({ config, api }) => {
                        const client = new BulkDataClient_1.BulkDataClient(config, api);
                        const { response } = await client.kickOff({ method: "POST", type, params: { _outputFormat } });
                        await client.cancelIfStarted(response);
                        assertions_1.expectFailedKickOff(response, `Parameter "_outputFormat=${_outputFormat}" was not rejected`);
                    });
                }));
                // _since ------------------------------------------------------
                test({
                    name: "Rejects _since={invalid date} parameter",
                    description: "The server should reject exports if the `_since` parameter is not a valid date"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ type, params: { _since: "0000-60-01T30:70:80+05:00" } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, `Parameter "_since=0000-60-01T30:70:80+05:00" was not rejected`);
                });
                test({
                    minVersion: "2",
                    name: "Rejects _since={invalid date} parameter in POST requests",
                    description: "The server should reject exports if the `_since` parameter is not a valid date"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ method: "POST", type, params: { _since: "0000-60-01T30:70:80+05:00" } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, `Parameter "_since=0000-60-01T30:70:80+05:00" was not rejected`);
                });
                test({
                    name: "Rejects _since={future date} parameter",
                    description: "The server should reject exports if the `_since` parameter is a date in the future"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ type, params: { _since: "2057-01-01T00:00:00+05:00" } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, `Parameter "_since=2057-01-01T00:00:00+05:00" was not rejected`);
                });
                test({
                    minVersion: "2",
                    name: "Rejects _since={future date} parameter in POST requests",
                    description: "The server should reject exports if the `_since` parameter is a date in the future"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ method: "POST", type, params: { _since: "2057-01-01T00:00:00+05:00" } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, `Parameter "_since=2057-01-01T00:00:00+05:00" was not rejected`);
                });
                // _type -------------------------------------------------------
                test({
                    name: "Validates the _type parameter",
                    description: "Verifies that the request is rejected if the `_type` contains invalid resource type"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ type, params: { _type: ["MissingType"] } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, `Parameter "_type=MissingType" was not rejected`);
                });
                test({
                    minVersion: "2",
                    name: "Accepts multiple _type parameters",
                    description: "Clients can use multiple `_type` parameters instead of single comma-separated lists"
                }, async ({ config, api }) => {
                    const types = config.supportedResourceTypes;
                    if (types.length < 2) {
                        return api.setNotSupported(`This test fas skipped because not enough resource ` +
                            `types were found in the capability statement`);
                    }
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ type, params: { _type: types.slice(0, 2) } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectSuccessfulKickOff(response, "Kick-off with multiple _type parameters failed");
                });
                test({
                    minVersion: "2",
                    name: "Validates the _type parameter in POST requests",
                    description: "Verifies that the request is rejected if the `_type` contains invalid resource type"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({ method: "POST", type, params: { _type: "MissingType" } });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, "Parameter _type=MissingType was not rejected");
                });
                test({
                    name: "Accepts the includeAssociatedData parameter",
                    minVersion: "2",
                    description: "When provided, servers with support for the parameter and " +
                        "requested values SHALL return or omit a pre-defined set of FHIR " +
                        "resources associated with the request. The `includeAssociatedData` " +
                        "parameter is optional so the servers can ignore it or reply with an error. " +
                        "Either way, servers should not reply with a server error (statusCode >= 500), " +
                        "even if they don't support it."
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // Try standard export with includeAssociatedData=LatestProvenanceResources.
                    const { response: response1 } = await client.kickOff({ type, params: { includeAssociatedData: "LatestProvenanceResources" } });
                    await client.cancelIfStarted(response1);
                    if (response1.statusCode === 202) {
                        return;
                    }
                    // Servers unable to support the requested includeAssociatedData
                    // values SHOULD return an error and OperationOutcome resource
                    // so clients can re-submit a request that omits those values
                    // (for example, if a server does not retain provenance data). 
                    assertions_1.expectFailedKickOff(response1, "Kick-off failed");
                    // Now try standard export with
                    // includeAssociatedData=LatestProvenanceResources, plus a
                    // "handling=lenient" value in the Prefer header. In this case,
                    // even if the server does not support "includeAssociatedData"
                    // it MAY process the request instead of returning an error.
                    const { response: response2 } = await client.kickOff({
                        type,
                        headers: {
                            prefer: "respond-async, handling=lenient"
                        },
                        params: {
                            includeAssociatedData: "LatestProvenanceResources"
                        },
                        labelPrefix: "Lenient "
                    });
                    await client.cancelIfStarted(response2);
                    // In case the server didn't even return a proper error response
                    // if (response2.statusCode >= 500) {
                    //     throw new Error("It appears that the includeAssociatedData parameter " +
                    //     "(or the handling=lenient value in the prefer header) is not supported by this server");
                    // }
                    assertions_1.expectSuccessfulKickOff(response2, "It appears that the includeAssociatedData parameter " +
                        "(or the handling=lenient value in the prefer header) is not supported by this server");
                    // TODO: We should also verify that Provenance resources are
                    // actually included in the export. However, we cannot know if
                    // Provenance is available for every resource, and if not, which
                    // resources to try to export.
                });
                test({
                    name: "Accepts multiple includeAssociatedData values as comma separated list",
                    minVersion: "2",
                    description: "When provided, servers with support for the parameter and " +
                        "requested values SHALL return or omit a pre-defined set of FHIR " +
                        "resources associated with the request. The `includeAssociatedData` " +
                        "parameter is optional so the servers can ignore it or reply with an error. " +
                        "Either way, servers should not reply with a server error (statusCode >= 500), " +
                        "even if they don't support it."
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({
                        type,
                        params: {
                            includeAssociatedData: "LatestProvenanceResources,RelevantProvenanceResources"
                        },
                        labelPrefix: "multiple comma-separated includeAssociatedData params - "
                    });
                    await client.cancelIfStarted(response, "Request with multiple comma-separated includeAssociatedData params - ");
                    assertions_1.expectSuccessfulKickOff(response, "Failed to start an export using multiple includeAssociatedData values as comma separated list");
                });
                test({
                    name: "Accepts multiple includeAssociatedData parameters",
                    minVersion: "2",
                    description: "When provided, servers with support for the parameter and " +
                        "requested values SHALL return or omit a pre-defined set of FHIR " +
                        "resources associated with the request. The `includeAssociatedData` " +
                        "parameter is optional so the servers can ignore it or reply with an error. " +
                        "Either way, servers should not reply with a server error (statusCode >= 500), " +
                        "even if they don't support it."
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({
                        type,
                        params: {
                            includeAssociatedData: [
                                "LatestProvenanceResources",
                                "RelevantProvenanceResources"
                            ]
                        },
                        labelPrefix: "multiple includeAssociatedData params - "
                    });
                    await client.cancelIfStarted(response, "Request with multiple includeAssociatedData params - ");
                    assertions_1.expectSuccessfulKickOff(response, "Failed to start an export using multiple includeAssociatedData parameters");
                });
                // _typeFilter -------------------------------------------------
                test({
                    name: "Accepts the _typeFilter parameter (v1)",
                    maxVersion: "1.0",
                    description: "The `_typeFilter` parameter is optional so the servers can " +
                        "ignore it or reply with an error. Either way, servers should not " +
                        "reply with a server error (statusCode >= 500), even if they don't support it"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // Start an export
                    const { response } = await client.kickOff({
                        type,
                        params: {
                            _typeFilter: "Patient?status=active"
                        }
                    });
                    // Cancel the export immediately
                    await client.cancelIfStarted(response);
                    // In version 1.0 it is not clear how the servers should respond
                    // if they do not support the _typeFilter parameter. They can
                    // reply with error or just ignore it. All we can do here is to
                    // verify that the presence of the _typeFilter did not result in
                    // a server error
                    if (response.statusCode === 202) {
                        assertions_1.expectSuccessfulKickOff(response);
                    }
                    else {
                        assertions_1.expectClientError(response);
                    }
                });
                test({
                    name: "Handles the _typeFilter parameter",
                    minVersion: "2",
                    description: "The `_typeFilter` parameter is optional. Servers that do not support it " +
                        "should reject it, unless `handling=lenient` is included in the `Prefer` header"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // First attempt
                    const { response: response1 } = await client.kickOff({
                        type,
                        params: {
                            _typeFilter: "Patient?status=active"
                        }
                    });
                    await client.cancelIfStarted(response1);
                    // If the export was successful assume that _typeFilter is
                    // supported. We have nothing else to do here.
                    if (response1.statusCode === 202) {
                        assertions_1.expectSuccessfulKickOff(response1, "Parameter _typeFilter was rejected");
                    }
                    // Second attempt
                    const { response: response2 } = await client.kickOff({
                        type,
                        headers: {
                            prefer: "respond-async, handling=lenient"
                        },
                        params: {
                            _typeFilter: "Patient?status=active"
                        },
                        labelPrefix: "Lenient - "
                    });
                    await client.cancelIfStarted(response2);
                    try {
                        assertions_1.expectSuccessfulKickOff(response2, "Parameter _typeFilter plus header \"prefer: respond-async, handling=lenient\" was rejected");
                    }
                    catch (ex) {
                        ex.message = "\n✖ The server was expected to ignore the _typeFilter parameter if handling=lenient is included in the Prefer header" + ex.message;
                        throw ex;
                    }
                });
                test({
                    name: "Handles multiple _typeFilter parameters",
                    minVersion: "2",
                    description: "The `_typeFilter` parameter is optional. Servers that do not support it " +
                        "should reject it, unless `handling=lenient` is included in the `Prefer` header"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // First attempt
                    const { response: response1 } = await client.kickOff({
                        type,
                        params: {
                            _typeFilter: ["Patient?status=active", "Patient?gender=male"]
                        }
                    });
                    await client.cancelIfStarted(response1);
                    // If the export was successful assume that _typeFilter is
                    // supported. We have nothing else to do here.
                    if (response1.statusCode === 202) {
                        assertions_1.expectSuccessfulKickOff(response1, "Request with multiple _typeFilter parameters failed");
                    }
                    // Second attempt
                    const { response: response2 } = await client.kickOff({
                        type,
                        headers: {
                            prefer: "respond-async, handling=lenient"
                        },
                        params: {
                            _typeFilter: ["Patient?status=active", "Patient?gender=male"]
                        },
                        labelPrefix: "Lenient "
                    });
                    await client.cancelIfStarted(response2);
                    try {
                        assertions_1.expectSuccessfulKickOff(response2, "Request with multiple _typeFilter parameters and handling=lenient failed");
                    }
                    catch (ex) {
                        ex.message = "\n✖ The server was expected to ignore multiple _typeFilter parameter errors if handling=lenient is included in the Prefer header" + ex.message;
                        throw ex;
                    }
                });
                test({
                    minVersion: "2",
                    name: "Accepts the _typeFilter parameter in POST requests",
                    description: "The `_typeFilter` parameter is optional so the servers " +
                        "should not reject it, even if they don't support it"
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    // Start an export
                    const { response: response1 } = await client.kickOff({
                        method: "POST",
                        type,
                        json: {
                            resourceType: "Parameters",
                            parameter: [
                                {
                                    name: "_typeFilter",
                                    valueString: "Patient?status=active"
                                }
                            ]
                        }
                    });
                    // Cancel the export immediately
                    await client.cancelIfStarted(response1);
                    // If the export was successful assume that _typeFilter is
                    // supported. We have nothing else to do here.
                    if (response1.statusCode === 202) {
                        assertions_1.expectSuccessfulKickOff(response1, "Request with _typeFilter parameter was rejected");
                    }
                    // Second attempt
                    const { response: response2 } = await client.kickOff({
                        method: "POST",
                        type,
                        headers: {
                            prefer: "respond-async, handling=lenient"
                        },
                        json: {
                            resourceType: "Parameters",
                            parameter: [
                                {
                                    name: "_typeFilter",
                                    valueString: "Patient?status=active"
                                }
                            ]
                        },
                        labelPrefix: "Lenient "
                    });
                    await client.cancelIfStarted(response2);
                    try {
                        assertions_1.expectSuccessfulKickOff(response2, "Request with _typeFilter parameter and handling=lenient was rejected");
                    }
                    catch (ex) {
                        ex.message = "\n✖ The server was expected to ignore _typeFilter parameter errors if handling=lenient is included in the Prefer header" + ex.message;
                        throw ex;
                    }
                });
                // _elements ---------------------------------------------------
                ["GET", "POST"].forEach((method) => {
                    test({
                        name: `Accepts the _elements parameter through ${method} ${type}-level kick-off requests`,
                        description: "Verifies that the server starts an export if called with valid parameters. " +
                            "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                            "returned. The response body should be either empty, or a JSON OperationOutcome.",
                        minVersion: "2"
                    }, async ({ config, api, context }) => {
                        const client = context.client = new BulkDataClient_1.BulkDataClient(config, api);
                        api.after(({ context }) => {
                            if (context.client && context.kickOffResponse) {
                                return context.client.cancelIfStarted(context.kickOffResponse);
                            }
                        });
                        const resourceType = config.fastestResource || "Patient";
                        // The '_elements' parameter is a string of comma-delimited FHIR Elements.
                        const { response: response1 } = await client.kickOff({
                            method,
                            type,
                            params: {
                                _elements: `id,${resourceType}.meta`,
                                _type: [resourceType]
                            }
                        });
                        context.kickOffResponse = response1;
                        // Servers unable to support _elements SHOULD return an error and
                        // OperationOutcome resource so clients can re-submit a request omitting
                        // the _elements parameter.
                        if (response1.statusCode != 202) {
                            assertions_1.expectFailedKickOff(response1, "Kick-off with _elements parameter failed");
                        }
                        await client.waitForExport();
                        assertions_1.expectSuccessfulExport(client.statusResponse, "Export failed");
                        if (!client.statusResponse?.body.output?.length) {
                            return api.setNotSupported("Unable to find enough data to export and complete this test");
                        }
                        const response = await client.downloadFileAt(0);
                        assertions_1.expectSuccessfulDownload(response, "Failed to download file at position 0");
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
                        assertions_1.expectNDJSONElements(response.body, ["id", `${resourceType}.meta`], "Invalid NDJSON structure");
                        // response.body.trim().split(/\n+/).forEach(line => {
                        //     const res = JSON.parse(line); // console.log(res);
                        //     expect(res, "Results must include an 'id' property").to.contain("id");
                        //     expect(res, "Results must include a 'meta' property").to.contain("meta");
                        //     expect(res.meta, "The meta element must have a 'tag' property").to.contain("tag");
                        //     expect(res.meta.tag, "The 'meta.tag' must be an array").to.be.an.array();
                        //     expect(
                        //         res.meta.tag,
                        //         "A tag with code='SUBSETTED' and system='http://terminology.hl7.org/CodeSystem/v3-ObservationValue' " +
                        //         "should be found in the 'meta.tag' array"
                        //     ).to.contain({
                        //         "system":"http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
                        //         "code":"SUBSETTED"
                        //     });
                        // });
                    });
                });
                test({
                    name: `Accepts multiple _elements parameters through GET ${type}-level kick-off requests`,
                    description: "Verifies that the server starts an export if called with multiple _elements parameters. " +
                        "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                        "returned. The response body should be either empty, or a JSON OperationOutcome.",
                    minVersion: "2"
                }, async ({ config, api, context }) => {
                    const client = context.client = new BulkDataClient_1.BulkDataClient(config, api);
                    api.after(({ context }) => {
                        if (context.client && context.kickOffResponse) {
                            return context.client.cancelIfStarted(context.kickOffResponse);
                        }
                    });
                    context.kickOffResponses = [];
                    const resourceType = "Patient";
                    // The '_elements' parameter is a string of comma-delimited FHIR Elements.
                    const { response: response1 } = await client.kickOff({
                        method: "GET",
                        type,
                        params: {
                            _elements: ["id", `${resourceType}.meta`],
                            _type: [resourceType]
                        }
                    });
                    context.kickOffResponse = response1;
                    // Servers unable to support _elements SHOULD return an error and
                    // OperationOutcome resource so clients can re-submit a request omitting
                    // the _elements parameter.
                    if (response1.statusCode != 202) {
                        assertions_1.expectFailedKickOff(response1, "Kick-off with multiple _elements parameters failed");
                    }
                    await client.waitForExport();
                    assertions_1.expectSuccessfulExport(client.statusResponse, "Export failed");
                    if (!client.statusResponse?.body.output?.length) {
                        return api.setNotSupported("Unable to find enough data to export and complete this test");
                    }
                    const response = await client.downloadFileAt(0);
                    assertions_1.expectSuccessfulDownload(response, "Failed to download file at position 0");
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
                    assertions_1.expectNDJSONElements(response.body, ["id", `${resourceType}.meta`], "Invalid NDJSON structure");
                    // response.body.trim().split(/\n+/).forEach(line => {
                    //     const res = JSON.parse(line); // console.log(res);
                    //     expect(res, "Results must include an 'id' property").to.contain("id");
                    //     expect(res, "Results must include a 'meta' property").to.contain("meta");
                    //     expect(res.meta, "The meta element must have a 'tag' property").to.contain("tag");
                    //     expect(res.meta.tag, "The 'meta.tag' must be an array").to.be.an.array();
                    //     expect(
                    //         res.meta.tag,
                    //         "A tag with code='SUBSETTED' and system='http://terminology.hl7.org/CodeSystem/v3-ObservationValue' " +
                    //         "should be found in the 'meta.tag' array"
                    //     ).to.contain({
                    //         "system":"http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
                    //         "code":"SUBSETTED"
                    //     });
                    // });
                });
                // patient -----------------------------------------------------
                if (type !== "system") {
                    test({
                        name: `Supports the patient parameter via the ${type}-export endpoint`,
                        description: "Makes a normal export and then tries to make another one limited to the first patient from the result.",
                        minVersion: "2"
                    }, async ({ config, api }) => {
                        const client = new BulkDataClient_1.BulkDataClient(config, api);
                        const { response: kickOffResponse1 } = await client.kickOff({
                            type,
                            labelPrefix: "First ",
                            params: {
                                _type: "Patient"
                            }
                        });
                        const file = await client.downloadFileAt(0);
                        await client.cancel(kickOffResponse1);
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
                            }
                            catch (ex) {
                                throw new Error(`Failed to parse Patient line from NDJSON: ${ex.message}`);
                            }
                        }
                        const { response: kickOffResponse2 } = await client.kickOff({
                            method: "POST",
                            type,
                            labelPrefix: "Second ",
                            json: {
                                resourceType: "Parameters",
                                parameter: [
                                    {
                                        name: "patient",
                                        valueReference: { reference: `Patient/${patient.id}` }
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
                        await client.cancel(kickOffResponse2);
                        const lines2 = file2.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                        code_1.expect(lines2.length, "Could not filter the results using the patient parameter").to.equal(1);
                        let patient2;
                        try {
                            patient2 = JSON.parse(lines2[0]);
                        }
                        catch (ex) {
                            throw new Error(`Failed to parse Patient line from NDJSON: ${ex.message}`);
                        }
                        code_1.expect(patient2.id, `Could not filter the results using the patient parameter. The patient ID should equal "${patient.id}"`).to.equal(patient.id);
                    });
                }
                else {
                    test({
                        name: "Rejects system-level export with patient parameter",
                        description: "The patient parameter is not applicable to system level export requests. " +
                            "This test verifies that such invalid export attempts are being rejected.",
                        minVersion: "2"
                    }, async ({ config, api }) => {
                        api.prerequisite({
                            assertion: config.systemExportEndpoint,
                            message: "The system-level export is not supported by this server"
                        });
                        const client = new BulkDataClient_1.BulkDataClient(config, api);
                        const { response } = await client.kickOff({
                            method: "POST",
                            type: "system",
                            json: {
                                resourceType: "Parameters",
                                parameter: [
                                    {
                                        "name": "patient",
                                        "valueReference": { reference: "Patient/123" }
                                    },
                                    {
                                        "name": "patient",
                                        "valueReference": { reference: "Patient/456" }
                                    }
                                ]
                            }
                        });
                        await client.cancelIfStarted(response);
                        if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                            // system-level export via POST is not supported by this server
                            return api.setNotSupported();
                        }
                        if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                            // It seems that system-level export via POST is not supported by this server
                            return api.setNotSupported();
                        }
                        assertions_1.expectFailedKickOff(response, "This kick-off request should have failed");
                    });
                }
            });
            test({
                name: "Can start an export",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                    "returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async ({ config, api }) => {
                const client = new BulkDataClient_1.BulkDataClient(config, api);
                const { response } = await client.kickOff({ type });
                await client.cancelIfStarted(response);
                assertions_1.expectSuccessfulKickOff(response);
            });
            test({
                minVersion: "2",
                name: "Can start an export from POST requests",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                    "returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async ({ config, api }) => {
                const client = new BulkDataClient_1.BulkDataClient(config, api);
                // Start an export
                const { response } = await client.kickOff({
                    method: "POST",
                    type,
                    json: {
                        resourceType: "Parameters",
                        parameter: []
                    }
                });
                await client.cancelIfStarted(response);
                assertions_1.expectSuccessfulKickOff(response, "Failed to make an export via POST");
            });
            if (type === "system") {
                test({
                    minVersion: "2",
                    name: "Rejects system-level export with patient parameter",
                    description: "The patient parameter is not applicable to system level export requests. " +
                        "This test verifies that such invalid export attempts are being rejected."
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({
                        method: "POST",
                        type,
                        json: {
                            resourceType: "Parameters",
                            parameter: [
                                {
                                    "name": "patient",
                                    "valueReference": { reference: "Patient/123" }
                                },
                                {
                                    "name": "patient",
                                    "valueReference": { reference: "Patient/456" }
                                }
                            ]
                        }
                    });
                    await client.cancelIfStarted(response);
                    assertions_1.expectFailedKickOff(response, "Export with patient parameter was not rejected");
                });
            }
            else {
                test({
                    name: "Can start an export with patient parameter",
                    minVersion: "2",
                    description: "This test verifies that export attempts including patient are not being rejected."
                }, async ({ config, api }) => {
                    const client = new BulkDataClient_1.BulkDataClient(config, api);
                    const { response } = await client.kickOff({
                        method: "POST",
                        type,
                        params: {
                            patient: ["123", "456"]
                        }
                    });
                    await client.cancelIfStarted(response);
                    assertions_1.expectSuccessfulKickOff(response, "Kick-off with patient parameter failed");
                });
            }
        });
    });
});
//# sourceMappingURL=kick-off.test.js.map