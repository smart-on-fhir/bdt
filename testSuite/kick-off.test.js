const { BulkDataClient } = require("./lib");

const exportTypes = [
    {
        idPrefix   : "Patient-level",
        name       : "Patient-level export",
        mountPoint : "patientExportEndpoint"
    },
    {
        idPrefix   : "System-level",
        name       : "System-level export",
        mountPoint : "systemExportEndpoint"
    },
    {
        idPrefix   : "Group-level",
        name       : "Group-level export",
        mountPoint : "groupExportEndpoint"
    }
];


module.exports = function(describe, it) {
    exportTypes.forEach(meta => {
        describe(meta.name, () => {

            it ({
                id  : `${meta.idPrefix}-01`,
                name: "Requires Accept header",
                description: 'The Accept header specifies the format of the optional OperationOutcome response ' +
                    'to the kick-off request. Currently, only <code>application/fhir+json</code> is supported.'
            }, async (cfg, api) => {
                
                // Skip if not supported
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                
                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // By default the kickOff method will do a proper request to the
                // kick-off endpoint, including accept and prefer headers.
                // We need to remove the accept header for this test.
                await client.kickOff({
                    json: false, // Remove the "accept: application/json" header
                    headers: {
                        accept: undefined // Remove the "accept: application/fhir+json" header
                    }
                });

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-02`,
                name: "Requires Prefer header to equal respond-async",
                description: 'The <b>Prefer</b> request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to <b>respond-async</b>. ' +
                            '<a href="https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers" target="_blank">Red More</a>'
            }, async (cfg, api) => {

                // Skip if not supported
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // By default the kickOff method will do a proper request to the
                // kick-off endpoint, including accept and prefer headers.
                // We need to remove the accept header for this test.
                await client.kickOff({
                    headers: {
                        prefer: undefined // Remove the "prefer: respond-async" header
                    }
                });

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            ([
                "application/fhir+ndjson",
                "application/ndjson",
                "ndjson"
            ].forEach((type, i) => {
                it ({
                    id  : `${meta.idPrefix}-03.${i}`,
                    name: `Accepts _outputFormat=${type}`,
                    description: `Verifies that the server accepts <code>${type}</code> as <b>_outputFormat</b> parameter`
                }, async (cfg, api) => {
                    if (!cfg[meta.mountPoint]) {
                        return api.setNotSupported(`${meta.name} is not supported by this server`);
                    }
                    const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                    // Set the _outputFormat parameter to the value we need to test
                    client.url.searchParams.set("_outputFormat", type);

                    // Start an export
                    await client.kickOff();

                    // Cancel the export immediately
                    await client.cancelIfStarted();

                    // Verify that we didn't get an error
                    client.expectSuccessfulKickOff();
                });
            }));

            ([
                "application/xml",
                "text/html",
                "x-custom"
            ].forEach((type, i) => {
                it ({
                    id  : `${meta.idPrefix}-04.${i}`,
                    name: `Rejects unsupported format "_outputFormat=${type}"`,
                    description: `This tests if the server rejects <code>_outputFormat=${type}</code> ` +
                        `parameter, even though <code>${type}</code> is valid mime type.`
                }, async (cfg, api) => {
                    if (!cfg[meta.mountPoint]) {
                        return api.setNotSupported(`${meta.name} is not supported by this server`);
                    }

                    const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                    // Set the _outputFormat parameter to the value we need to test
                    client.url.searchParams.set("_outputFormat", type);
                    
                    // Start an export
                    await client.kickOff();

                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted();

                    // Finally check that we have got an error response
                    client.expectFailedKickOff();
                });
            }));

            it ({
                id  : `${meta.idPrefix}-05`,
                name: "Rejects _since={invalid date} parameter",
                description: "The server should reject exports if the <code>_since</code> parameter is not a valid date"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Set the _since parameter to invalid date
                client.url.searchParams.set("_since", "0000-60-01");
                
                // Start an export
                await client.kickOff();

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-06`,
                name: "Rejects _since={future date} parameter",
                description: "The server should reject exports if the <code>_since</code> parameter is a date in the future"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                
                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Set the _since parameter to a date that is valid but in the future
                client.url.searchParams.set("_since", "2057-01-01");
                
                // Start an export
                await client.kickOff();

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-07`,
                name: "Validates the _type parameter",
                description: "Verifies that the request is rejected if the <code>_type</code> " +
                    "contains invalid resource type"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                
                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Set the _type parameter some invalid value
                client.url.searchParams.set("_type", "MissingType");
                
                // Start an export
                await client.kickOff();

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-08`,
                name: "Accepts the _typeFilter parameter",
                description: "The <code>_typeFilter</code> parameter is optional so the servers " +
                    "should not reject it, even if they don't support it"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // Set the _typeFilter parameter some "valid-looking" value
                client.url.searchParams.set("_typeFilter", "Patient?status=active");
                
                // Start an export
                await client.kickOff();

                // Cancel the export immediately
                await client.cancelIfStarted();

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-09`,
                name: "Response - Success",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be <code>202 Accepted</code> and a <code>Content-Location</code> " +
                    "header must be returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // Start an export
                await client.kickOff();

                // Cancel the export immediately
                await client.cancelIfStarted();

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });
        });
    });
};
