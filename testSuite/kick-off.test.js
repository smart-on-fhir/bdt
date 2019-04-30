const { ExportHelper } = require("./lib");

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
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                delete exp.requestHeaders.accept;
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expect400();
            });

            it ({
                id  : `${meta.idPrefix}-02`,
                name: "Requires Prefer header to equal respond-async",
                description: 'The <b>Prefer</b> request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to <b>respond-async</b>. ' +
                            '<a href="https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers" target="_blank">Red More</a>'
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                delete exp.requestHeaders.prefer;
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expect400();
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
                    const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                    exp.url.searchParams.set("_outputFormat", type);
                    exp.url.searchParams.set("_type", "Patient");
                    await exp.kickOff();
                    await exp.cancelIfStarted();
                    exp.expectSuccess();
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
                    const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                    exp.url.searchParams.set("_outputFormat", type);
                    await exp.kickOff();
                    await exp.cancelIfStarted();
                    exp.expect400();
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
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}?_since=0000-60-01`);
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expect400();
            });

            it ({
                id  : `${meta.idPrefix}-06`,
                name: "Rejects _since={future date} parameter",
                description: "The server should reject exports if the <code>_since</code> parameter is a date in the future"
            }, async (cfg, api) => {
                if (!cfg[meta.mountPoint]) {
                    return api.setNotSupported(`${meta.name} is not supported by this server`);
                }
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}?_since=2057-01-01`);
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expect400();
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
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}?_type=MissingType`);
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expect400();
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
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}`);
                exp.url.searchParams.set("_type", "Patient");
                exp.url.searchParams.set("_typeFilter", "Patient?status=active");
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expectSuccess();
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
                const exp = new ExportHelper(cfg, api, `${cfg.baseURL}${cfg[meta.mountPoint]}?_type=Patient`);
                await exp.kickOff();
                await exp.cancelIfStarted();
                exp.expectSuccess();
            });
        });
    });
};
