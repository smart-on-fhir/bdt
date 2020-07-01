const { expect }  = require("code");
const { request } = require("./lib");

async function fetchConformance(cfg, api) {
    const req = await request({
        uri: `${cfg.baseURL}/metadata`,
        json: true,
        strictSSL: cfg.strictSSL,
        headers: {
            accept: "application/fhir+json"
        }
    });

    api.logRequest(req);
    const { response } = await req.promise();
    api.logResponse(response);
    return response;
}

async function fetchWellKnownSmartConfiguration(cfg, api) {
    const req = await request({
        uri: `${cfg.baseURL}/.well-known/smart-configuration`,
        json: true,
        strictSSL: cfg.strictSSL
    });

    api.logRequest(req);
    const { response } = await req.promise();
    api.logResponse(response);
    return response;
}

module.exports = function(describe, it) {
    describe("Metadata", () => {
        describe("CapabilityStatement", () => {

            let count = 0;

            it ({
                id  : `CapabilityStatement-${++count}`,
                name: "The CapabilityStatement instantiates the bulk-data CapabilityStatement",
                description: "To declare conformance with this IG, a server should include " +
                    "the following URL in its own CapabilityStatement.instantiates:\n\n" +
                    "[http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data]" +
                    "(http://www.hl7.org/fhir/bulk-data/CapabilityStatement-bulk-data.html).\n\n" +
                    "The CapabilityStatement should contain something like:\n" +
                    "```json\n\"instantiates\": [\n" +
                    '    "http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data"\n' +
                    "]\n```"
            }, async(cfg, api) => {
                const response = await fetchConformance(cfg, api);

                // Having a CapabilityStatement is optional for bulk data servers
                // (unless they are also FHIR servers, which they typically are).
                // However, missing a CapabilityStatement will generate a warning.
                if (response.statusCode === 404) {
                    return api.warn(`No capability statement found at "${cfg.baseURL}/metadata"`);
                }

                // If a CapabilityStatement was found, then
                // CapabilityStatement.instantiates SHOULD be used properly.
                try {
                    expect(response.body.instantiates.indexOf("http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data")).to.be.greaterThan(-1);
                } catch(ex) {
                    api.warn("http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data was not found in CapabilityStatement.instantiates");
                }
            });


            it ({
                id  : `CapabilityStatement-${++count}`,
                name: 'Includes the token endpoint in the CapabilityStatement',
                description: "If a server requires SMART on FHIR authorization " +
                    "for access, its metadata **must** support automated discovery " +
                    "of OAuth2 endpoints by including a \"complex\" extension " +
                    "(that is, an extension with multiple components inside) " +
                    "on the `CapabilityStatement.rest.security` element. Any " +
                    "time a client sees this extension, it must be prepared to " +
                    "authorize using SMART's OAuth2-based protocol.\n" +
                    "This test is expecting to find the in `CapabilityStatement` " +
                    'an entry like:\n```\n"rest": [\n' +
                    '  {\n' +
                    '    "mode": "server",\n' +
                    '    "security": {\n' +
                    '      "extension": [\n' +
                    '        {\n' +
                    '          "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",\n' +
                    '          "extension": [\n' +
                    '            {\n' +
                    '              "url": "token",\n' +
                    '              "valueUri": "https://someserver.org/auth/token"\n' +
                    '            }\n' +
                    '          ]\n' +
                    '        }\n' +
                    '      ]\n' +
                    '    }\n' +
                    '  }\n' +
                    ']\n```\n' +
                    'Having a CapabilityStatement is optional for bulk data servers, ' +
                    'unless they are also FHIR servers (which they typically are). ' +
                    'However, missing a CapabilityStatement will generate a warning here.'

                    // The top-level extension uses the URL http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris, with the following internal components:

                    // Component	Required?	Description
                    // authorize	required	valueUri indicating the OAuth2 "authorize" endpoint for this FHIR server.
                    // token	required	valueUri indicating the OAuth2 "token" endpoint for this FHIR server.
                    // register	optional	valueUri indicating the OAuth2 dynamic registration endpoint for this FHIR server, if supported.
                    // manage	optional	valueUri indicating the user-facing authorization management workflow entry point for this FHIR server. Overview in this presentation.
            }, async(cfg, api) => {
                const response = await fetchConformance(cfg, api);
                
                // Having a CapabilityStatement is optional for bulk data servers
                // (unless they are also FHIR servers, which they typically are).
                // However, missing a CapabilityStatement will generate a warning.
                if (response.statusCode === 404) {
                    return api.warn(`No capability statement found at "${cfg.baseURL}/metadata"`);
                }

                // If a CapabilityStatement was found and if the server requires
                // authorization, then the security extensions MUST be defined.
                let extensions;
                try {
                    extensions = response.body.rest[0].security.extension.find(e => {
                        return e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
                    }).extension;
                } catch (ex) {
                    throw new Error(`Unable to find security extensions at "${cfg.baseURL}/metadata"`);
                }

                // If a CapabilityStatement was found and if the server requires
                // authorization, then the token endpoint MUST be defined.
                const extToken = extensions.find(e => e.url === "token");
                if (!extToken || !extToken.valueUri) {
                    throw new Error(`Unable to find the "token" endpoint in the conformance statement`);
                }
            });

            [
                {
                    operation: "export",
                    pref     : "systemExportEndpoint"
                },
                {
                    operation: "patient-export",
                    pref     : "patientExportEndpoint"
                },
                {
                    operation: "group-export",
                    pref     : "groupExportEndpoint"
                }
            ].forEach((meta, i) => {
                it ({
                    id  : `CapabilityStatement-${count + i + 1}`,
                    name: `Check if "${meta.operation}" operation is defined in the CapabilityStatement`,
                    description: "This test expects to find in the CapabilityStatement " +
                        'an entry like:\n```\n"rest": [\n' +
                        '  {\n' +
                        '    "operation": [\n' +
                        '      {\n' +
                        `        "name" : "${meta.operation}"\n` +
                        '      }\n' +
                        '    ]\n' +
                        '  }\n' +
                        ']\n```'
                }, async(cfg, api) => {
                    const response = await fetchConformance(cfg, api);

                    // Having a CapabilityStatement is optional for bulk data servers
                    // (unless they are also FHIR servers, which they typically are).
                    // However, missing a CapabilityStatement will generate a warning.
                    if (response.statusCode === 404) {
                        return api.warn(`No capability statement found at "${cfg.baseURL}/metadata"`);
                    }

                    // If the server has not declared that it supports this type of
                    // export, then skip the test
                    if (!String(cfg[meta.pref] || "").trim()) {
                        return api.setNotSupported(`The "${meta.operation}" operation is not supported by this server`);
                    }
    
                    // If a CapabilityStatement was found, then the export
                    // operations MUST be defined.
                    try {
                        let operation = response.body.rest[0].operation.find(e => e.name === meta.operation);
                        if (!operation) {
                            throw new Error();
                        }
                    } catch (ex) {
                        throw new Error(`Unable to find "${meta.operation}" operation at "${cfg.baseURL}/metadata"`);
                    }
                });
            });
        });

        describe("Well Known SMART Configuration", () => {
            it ({
                id: "WellKnownSmartConfiguration-1",
                name: "Includes token_endpoint definition",
                description: 'This test verifies that the server provides a ' +
                    '`/.well-known/smart-configuration` and that ' +
                    'a `token_endpoint` property is declared ' +
                    'within that file.'
            }, async(cfg, api) => {
                const json = await fetchWellKnownSmartConfiguration(cfg, api);

                // Having a WellKnown JSON is optional but we show a warning if
                // it is missing.
                if (json.statusCode === 404) {
                    return api.warn(`No WellKnown JSON found at "${cfg.baseURL}/.well-known/smart-configuration"`);
                }

                // If WellKnown JSON is found, then it must include the 
                // "token_endpoint" property
                try {
                    expect(json).to.include("token_endpoint");
                } catch(ex) {
                    throw new Error('The WellKnown JSON did not include a "token_endpoint" declaration');
                }
            });
        });
    });
};
