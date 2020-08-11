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
            let count = 0;

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Requires Accept header in GET requests",
                description: 'The Accept header specifies the format of the optional OperationOutcome response ' +
                    'to the kick-off request. Currently, only `application/fhir+json` is supported.'
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
                id  : `${meta.idPrefix}-${count++}`,
                name: "Requires Accept header in POST requests",
                description: 'The Accept header specifies the format of the optional OperationOutcome response ' +
                    'to the kick-off request. Currently, only `application/fhir+json` is supported.'
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
                    // json: true, // Remove the "accept: application/json" header
                    method: "POST",
                    body: { resourceType: "Parameters", parameter: [] },
                    headers: {
                        accept: undefined // Remove the "accept: application/fhir+json" header
                    }
                });


                // console.log(client.kickOffResponse.body)

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Requires Prefer header to equal respond-async in GET requests",
                description: 'The **Prefer** request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to **respond-async**. ' +
                            '[Red More](https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers).'
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

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Requires Prefer header to equal respond-async in POST requests",
                description: 'The **Prefer** request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to **respond-async**. ' +
                            '[Red More](https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers).'
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
                    method: "POST",
                    body: { resourceType: "Parameters", parameter: [] },
                    headers: {
                        prefer: undefined // Remove the "prefer: respond-async" header
                    }
                });

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            ([
                "application/fhir+ndjson",
                "application/ndjson",
                "ndjson"
            ].forEach((type, i) => {
                it ({
                    id  : `${meta.idPrefix}-${count++}.${i}`,
                    name: `Accepts _outputFormat=${type} in GET requests`,
                    description: `Verifies that the server accepts \`${type}\` as **_outputFormat** parameter`
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

                it ({
                    id  : `${meta.idPrefix}-${count++}.${i}`,
                    name: `Accepts _outputFormat=${type} in POST requests`,
                    description: `Verifies that the server accepts \`${type}\` as **_outputFormat** parameter`
                }, async (cfg, api) => {
                    if (!cfg[meta.mountPoint]) {
                        return api.setNotSupported(`${meta.name} is not supported by this server`);
                    }
                    const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                    // Start an export
                    await client.kickOff({
                        method: "POST",
                        body: {
                            resourceType: "Parameters",
                            parameter: [
                                {
                                    name: "_outputFormat",
                                    valueString: type
                                }
                            ]
                        }
                    });

                    // Cancel the export immediately
                    await client.cancelIfStarted();

                    if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                        return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                    }
    
                    if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                        return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                    }

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
                    name: `Rejects unsupported format "_outputFormat=${type}" in GET requests`,
                    description: `This tests if the server rejects \`_outputFormat=${type}\` ` +
                        `parameter, even though \`${type}\` is valid mime type.`
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

                it ({
                    id  : `${meta.idPrefix}-04.${i}`,
                    name: `Rejects unsupported format "_outputFormat=${type}" in POST requests`,
                    description: `This tests if the server rejects \`_outputFormat=${type}\` ` +
                        `parameter, even though \`${type}\` is valid mime type.`
                }, async (cfg, api) => {
                    if (!cfg[meta.mountPoint]) {
                        return api.setNotSupported(`${meta.name} is not supported by this server`);
                    }

                    const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                    // Set the _outputFormat parameter to the value we need to test
                    client.url.searchParams.set("_outputFormat", type);
                    
                    // Start an export
                    await client.kickOff({
                        method: "POST",
                        body: {
                            resourceType: "Parameters",
                            parameter: [
                                {
                                    name: "_outputFormat",
                                    valueString: type
                                }
                            ]
                        }
                    });

                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted();

                    if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                        return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                    }
    
                    if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                        return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                    }

                    // Finally check that we have got an error response
                    client.expectFailedKickOff();
                });
            }));

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Rejects _since={invalid date} parameter in GET requests",
                description: "The server should reject exports if the `_since` parameter is not a valid date"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Set the _since parameter to invalid date
                client.url.searchParams.set("_since", "0000-60-01T30:70:80+05:00");
                
                // Start an export
                await client.kickOff();

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Rejects _since={invalid date} parameter in POST requests",
                description: "The server should reject exports if the `_since` parameter is not a valid date"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    body: {
                        resourceType: "Parameters",
                        parameter: [
                            {
                                name: "_since",
                                valueString: "0000-60-01T30:70:80+05:00"
                            }
                        ]
                    }
                });

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Rejects _since={future date} parameter in GET requests",
                description: "The server should reject exports if the `_since` parameter is a date in the future"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                
                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Set the _since parameter to a date that is valid but in the future
                client.url.searchParams.set("_since", "2057-01-01T00:00:00+05:00");
                
                // Start an export
                await client.kickOff();

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Rejects _since={future date} parameter in POST requests",
                description: "The server should reject exports if the `_since` parameter is a date in the future"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                
                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Start an export
                await client.kickOff({
                    method: "POST",
                    body: {
                        resourceType: "Parameters",
                        parameter: [
                            {
                                name: "_since",
                                valueString: "2057-01-01T00:00:00+05:00"
                            }
                        ]
                    }
                });

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Validates the _type parameter in GET requests",
                description: "Verifies that the request is rejected if the `_type` " +
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
                id  : `${meta.idPrefix}-${count++}`,
                name: "Validates the _type parameter in POST requests",
                description: "Verifies that the request is rejected if the `_type` " +
                    "contains invalid resource type"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                
                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);

                // Set the _type parameter some invalid value
                client.url.searchParams.set("_type", "MissingType");
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    body: {
                        resourceType: "Parameters",
                        parameter: [
                            {
                                name: "_type",
                                valueString: "MissingType"
                            }
                        ]
                    }
                });

                // If the server did not return an error as expected, an export
                // might actually been started. Make sure we cancel that!
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Finally check that we have got an error response
                client.expectFailedKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Accepts the _typeFilter parameter in GET requests",
                description: "The `_typeFilter` parameter is optional so the servers " +
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
                id  : `${meta.idPrefix}-${count++}`,
                name: "Accepts the _typeFilter parameter in POST requests",
                description: "The `_typeFilter` parameter is optional so the servers " +
                    "should not reject it, even if they don't support it"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    body: {
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
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Can start an export from GET requests",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                    "returned. The response body should be either empty, or a JSON OperationOutcome."
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

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Can start an export from POST requests",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                    "returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }

                const client = new BulkDataClient(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    body: {
                        resourceType: "Parameters",
                        parameter: []
                    }
                });

                // Cancel the export immediately
                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                    return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                }

                if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                    return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                }

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });
        });
    });
};
