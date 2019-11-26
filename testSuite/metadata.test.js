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
                description: "To declare conformance with this IG, a server <b>should</b> include " +
                    "the following URL in its own <code>CapabilityStatement.instantiates</code>: " +
                    '<a target="_blank" href="https://build.fhir.org/ig/HL7/bulk-data/CapabilityStatement-bulk-data.html">' +
                    "http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data</a>. The <code>CapabilityStatement</code> " +
                    'should contain something like:<pre>"instantiates": [\n' +
                    '    "http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data"\n' +
                    "]</pre>"
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
                    "for access, its metadata <b>must</b> support automated discovery " +
                    "of OAuth2 endpoints by including a “complex” extension " +
                    "(that is, an extension with multiple components inside) " +
                    "on the <code>CapabilityStatement.rest.security</code> " +
                    "element. Any time a client sees this extension, it must " +
                    "be prepared to authorize using SMART’s OAuth2-based protocol." +
                    "<br/> This test is expecting to find the in CapabilityStatement " +
                    'an entry like:<pre>"rest": [\n' +
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
                    ']</pre>' +
                    'Having a CapabilityStatement is optional for bulk data servers, ' +
                    'unless they are also FHIR servers (which they typically are). ' +
                    'However, missing a CapabilityStatement will generate a warning here. '
            }, async (cfg, api) => {
                function throwOrWarn(msg) {
                    if (cfg.requiresAuth) {
                        throw new Error(msg);
                    } else {
                        api.warn(msg);
                    }
                }
                
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
                    return throwOrWarn(`Unable to find security extensions at "${cfg.baseURL}/metadata"`);
                }

                // If a CapabilityStatement was found and if the server requires
                // authorization, then the token endpoint MUST be defined.
                const extToken = extensions.find(e => e.url === "token");
                if (!extToken || !extToken.valueUri) {
                    throwOrWarn(`Unable to find the "token" endpoint in the conformance statement`);
                }
            });

            ["export", "patient-export", "group-export"].forEach((type, i) => {
                it ({
                    id  : `CapabilityStatement-${count + i + 1}`,
                    name: `Check if "${type}" operation is defined in the CapabilityStatement`,
                    description: "This test expects to find in the CapabilityStatement " +
                        'an entry like:<pre>"rest": [\n' +
                        '  {\n' +
                        '    "operation": [\n' +
                        '      {\n' +
                        `        "name" : "${type}"\n` +
                        '      }\n' +
                        '    ]\n' +
                        '  }\n' +
                        ']</pre>'
                }, async(cfg, api) => {
                    const response = await fetchConformance(cfg, api);

                    // Having a CapabilityStatement is optional for bulk data servers
                    // (unless they are also FHIR servers, which they typically are).
                    // However, missing a CapabilityStatement will generate a warning.
                    if (response.statusCode === 404) {
                        return api.warn(`No capability statement found at "${cfg.baseURL}/metadata"`);
                    }
    
                    // If a CapabilityStatement was found, then the export
                    // operations MUST be defined.
                    try {
                        let operation = response.body.rest[0].operation.find(e => e.name === type);
                        if (!operation) {
                            throw new Error();
                        }
                    } catch (ex) {
                        throw new Error(`Unable to find "${type}" operation at "${cfg.baseURL}/metadata"`);
                    }
                });
            });
        });

        describe("Well Known SMART Configuration", () => {
            it ({
                id: "WellKnownSmartConfiguration-1",
                name: "Includes token_endpoint definition",
                description: 'This test verifies that the server provides a ' +
                    '<code>/.well-known/smart-configuration</code> and that ' +
                    'a <code>token_endpoint</code> property is declared ' +
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
