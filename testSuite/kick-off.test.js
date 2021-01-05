const { expect } = require("code");
const { BulkDataClient } = require("./lib");

const exportTypes = [
    {
        idPrefix   : "Patient-level",
        name       : "Patient-level export",
        type       : "patient"
    },
    {
        idPrefix   : "System-level",
        name       : "System-level export",
        type       : "system"
    },
    {
        idPrefix   : "Group-level",
        name       : "Group-level export",
        type       : "group"
    }
];


module.exports = function(describe, it) {
    exportTypes.forEach(meta => {
        describe(meta.name, () => {
            let count = 0;

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Requires Accept header",
                description: 'The Accept header specifies the format of the optional OperationOutcome response ' +
                    'to the kick-off request. Currently, only `application/fhir+json` is supported.'
            }, async (cfg, api) => {
                
                const client = new BulkDataClient(cfg, api);
                
                // By default the kickOff method will do a proper request to the
                // kick-off endpoint, including accept and prefer headers.
                // We need to remove the accept header for this test.
                await client.kickOff({
                    type: meta.type,
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
                version: "1.2",
                description: 'The Accept header specifies the format of the optional OperationOutcome response ' +
                    'to the kick-off request. Currently, only `application/fhir+json` is supported.'
            }, async (cfg, api) => {
                
                const client = new BulkDataClient(cfg, api);
                
                // By default the kickOff method will do a proper request to the
                // kick-off endpoint, including accept and prefer headers.
                // We need to remove the accept header for this test.
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    headers: {
                        accept: undefined // Remove the "accept: application/fhir+json" header
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
                name: "Requires Prefer header to contain respond-async",
                description: 'The **Prefer** request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to **respond-async**. ' +
                            '[Red More](https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers).'
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);
                
                // By default the kickOff method will do a proper request to the
                // kick-off endpoint, including accept and prefer headers.
                // We need to remove the accept header for this test.
                await client.kickOff({
                    type: meta.type,
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
                name: "Requires Prefer header to contain respond-async in POST requests",
                version: "1.2",
                description: 'The **Prefer** request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to **respond-async**. ' +
                            '[Red More](https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers).'
            }, async (cfg, api) => {

                
                const client = new BulkDataClient(cfg, api);
                
                // By default the kickOff method will do a proper request to the
                // kick-off endpoint, including accept and prefer headers.
                // We need to remove the accept header for this test.
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
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
                    name: `Accepts _outputFormat=${type}`,
                    description: `Verifies that the server accepts \`${type}\` as **_outputFormat** parameter`
                }, async (cfg, api) => {
                    const client = new BulkDataClient(cfg, api);

                    // Start an export
                    await client.kickOff({
                        type: meta.type,
                        params: {
                            _outputFormat: type
                        }
                    });

                    // Cancel the export immediately
                    await client.cancelIfStarted();

                    // Verify that we didn't get an error
                    client.expectSuccessfulKickOff();
                });

                it ({
                    id  : `${meta.idPrefix}-${count++}.${i}`,
                    name: `Accepts _outputFormat=${type} in POST requests`,
                    version: "1.2",
                    description: `Verifies that the server accepts \`${type}\` as **_outputFormat** parameter`
                }, async (cfg, api) => {
                    const client = new BulkDataClient(cfg, api);

                    // Start an export
                    await client.kickOff({
                        method: "POST",
                        type: meta.type,
                        params: {
                            _outputFormat: type
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
                    name: `Rejects unsupported format "_outputFormat=${type}"`,
                    description: `This tests if the server rejects \`_outputFormat=${type}\` ` +
                        `parameter, even though \`${type}\` is valid mime type.`
                }, async (cfg, api) => {

                    const client = new BulkDataClient(cfg, api);
                    
                    // Start an export
                    await client.kickOff({
                        type: meta.type,
                        params: {
                            _outputFormat: type
                        }
                    });

                    // If the server did not return an error as expected, an export
                    // might actually been started. Make sure we cancel that!
                    await client.cancelIfStarted();

                    // Finally check that we have got an error response
                    client.expectFailedKickOff();
                });

                it ({
                    id  : `${meta.idPrefix}-04.${i}`,
                    version: "1.2",
                    name: `Rejects unsupported format "_outputFormat=${type}" in POST requests`,
                    description: `This tests if the server rejects \`_outputFormat=${type}\` ` +
                        `parameter, even though \`${type}\` is valid mime type.`
                }, async (cfg, api) => {

                    const client = new BulkDataClient(cfg, api);

                    // Start an export
                    await client.kickOff({
                        method: "POST",
                        type: meta.type,
                        params: {
                            _outputFormat: type
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
                name: "Rejects _since={invalid date} parameter",
                description: "The server should reject exports if the `_since` parameter is not a valid date"
            }, async (cfg, api) => {
                const client = new BulkDataClient(cfg, api);
                
                // Start an export
                await client.kickOff({
                    type: meta.type,
                    params: {
                        _since: "0000-60-01T30:70:80+05:00"
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
                version: "1.2",
                name: "Rejects _since={invalid date} parameter in POST requests",
                description: "The server should reject exports if the `_since` parameter is not a valid date"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    params: {
                        _since: "0000-60-01T30:70:80+05:00"
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
                name: "Rejects _since={future date} parameter",
                description: "The server should reject exports if the `_since` parameter is a date in the future"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                // Start an export
                await client.kickOff({
                    type: meta.type,
                    params: {
                        _since: "2057-01-01T00:00:00+05:00"
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
                version: "1.2",
                name: "Rejects _since={future date} parameter in POST requests",
                description: "The server should reject exports if the `_since` parameter is a date in the future"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                // Start an export
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    params: {
                        _since: "2057-01-01T00:00:00+05:00"
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
                name: "Validates the _type parameter",
                description: "Verifies that the request is rejected if the `_type` " +
                    "contains invalid resource type"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                // Start an export
                await client.kickOff({
                    params: {
                        _type: ["MissingType"]
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
                version: "1.2",
                name: "Validates the _type parameter in POST requests",
                description: "Verifies that the request is rejected if the `_type` " +
                    "contains invalid resource type"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    params: {
                        _type: ["MissingType"]
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
                name: "Accepts the _typeFilter parameter",
                maxVersion: "1.0",
                description: "The `_typeFilter` parameter is optional so the servers " +
                    "should reply with a server error, even if they don't support it"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                // Start an export
                await client.kickOff({
                    type: meta.type,
                    params: {
                        _typeFilter: "Patient?status=active"
                    }
                });

                // Cancel the export immediately
                await client.cancelIfStarted();

                // In version 1.0 it is not clear how the servers should respond
                // if they do not support the _typeFilter parameter. The can
                // reply with error or just ignore it. All we can do here is to
                // verify that the presence of the _typeFilter did not result in
                // a server error

                if (client.kickOffResponse.statusCode === 202) {
                    return client.expectSuccessfulKickOff();
                } else {
                    expect(client.kickOffResponse.statusCode).to.be.between(399, 499);
                }
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Handles the _typeFilter parameter",
                version: "1.2",
                description: "The `_typeFilter` parameter is optional. Servers that do not support it " +
                    "should reject it, unless `handling=lenient` is included in the `Prefer` header"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                // First attempt
                await client.kickOff({
                    type: meta.type,
                    params: {
                        _typeFilter: "Patient?status=active"
                    }
                });

                await client.cancelIfStarted();

                // If the export was successful assume that _typeFilter is
                // supported. We have nothing else to do here.
                if (client.kickOffResponse.statusCode === 202) {
                    return client.expectSuccessfulKickOff();
                }

                // Second attempt
                await client.kickOff({
                    type: meta.type,
                    headers: {
                        prefer: "respond-async,handling=lenient"
                    },
                    params: {
                        _typeFilter: "Patient?status=active"
                    }
                });

                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode !== 202) {
                    throw new Error("The server was expected to ignore the _typeFilter parameter if handling=lenient is included in the Prefer header");
                }

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                version: "1.2",
                name: "Accepts the _typeFilter parameter in POST requests",
                description: "The `_typeFilter` parameter is optional so the servers " +
                    "should not reject it, even if they don't support it"
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
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

                // If the export was successful assume that _typeFilter is
                // supported. We have nothing else to do here.
                if (client.kickOffResponse.statusCode === 202) {
                    return client.expectSuccessfulKickOff();
                }

                // Second attempt
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    headers: {
                        prefer: "respond-async,handling=lenient"
                    },
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

                await client.cancelIfStarted();

                if (client.kickOffResponse.statusCode !== 202) {
                    throw new Error("The server was expected to ignore the _typeFilter parameter if handling=lenient is included in the Prefer header");
                }

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                name: "Can start an export",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                    "returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);
                
                // Start an export
                await client.kickOff({ type: meta.type });

                // Cancel the export immediately
                await client.cancelIfStarted();

                // Verify that we didn't get an error
                client.expectSuccessfulKickOff();
            });

            it ({
                id  : `${meta.idPrefix}-${count++}`,
                version: "1.2",
                name: "Can start an export from POST requests",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be `202 Accepted` and a `Content-Location` header must be " +
                    "returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);
                
                // Start an export
                await client.kickOff({
                    method: "POST",
                    type: meta.type,
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

            if (meta.idPrefix == "System-level") {

                it ({
                    id  : `${meta.idPrefix}-${count++}`,
                    version: "1.2",
                    name: "Rejects system-level export with patient parameter",
                    description: "The patient parameter is not applicable to system level export requests. " +
                        "This test verifies that such invalid export attempts are being rejected."
                }, async (cfg, api) => {
                   
                    const client = new BulkDataClient(cfg, api);                    

                    await client.kickOff({
                        method: "POST",
                        type: meta.type,
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
                        return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                    }
        
                    if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                        return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                    }
        
                    // Finally check that we have got an error response
                    client.expectFailedKickOff();
                });
            }
            else {
                it ({
                    id  : `${meta.idPrefix}-${count++}`,
                    name: "Can start an export with patient parameter",
                    version: "1.2",
                    description: "This test verifies that export attempts including patient are not being rejected."
                }, async (cfg, api) => {
                    
                    const client = new BulkDataClient(cfg, api);
        
                    await client.kickOff({
                        method: "POST",
                        type: meta.type,
                        params: {
                            patient: ["123", "456"]
                        }
                    });
        
                    await client.cancelIfStarted();
        
                    if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                        return api.setNotSupported(`${meta.name} via POST is not supported by this server`);
                    }
        
                    if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                        return api.setNotSupported(`It seems that ${meta.name} via POST is not supported by this server`);
                    }
        
                    // Finally check that we have got an error response
                    client.expectSuccessfulKickOff();
                });
            }
        });
    });
};
