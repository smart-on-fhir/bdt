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

    if (response.statusCode === 404) {
        // if (!cfg.requiresAuth) {
        //     api.setNotSupported(`This server does not require authorization`);
        // }
        throw new Error(`No capability statement found at "${cfg.baseURL}/metadata"`);
    }

    return response;
}

module.exports = function(describe, it) {
    describe("Metadata", () => {
        describe("CapabilityStatement", () => {

            it ({
                id  : `CapabilityStatement-01`,
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
                try {
                    expect(response.body.instantiates.indexOf("http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data"))
                        .to.be.greaterThan(-1);
                } catch(ex) {
                    throw new Error("http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data was not found in CapabilityStatement.instantiates");
                }
            });


            it ({
                id  : `CapabilityStatement-02`,
                name: 'Test the CapabilityStatement',
                description: "If a server requires SMART on FHIR authorization " +
                    "for access, its metadata must support automated discovery " +
                    "of OAuth2 endpoints by including a \"complex\" extension " +
                    "(that is, an extension with multiple components inside) " +
                    "on the `CapabilityStatement.rest.security` element. Any " +
                    "time a client sees this extension, it must be prepared to " +
                    "authorize using SMART's OAuth2-based protocol."

                    // The top-level extension uses the URL http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris, with the following internal components:

                    // Component	Required?	Description
                    // authorize	required	valueUri indicating the OAuth2 "authorize" endpoint for this FHIR server.
                    // token	required	valueUri indicating the OAuth2 "token" endpoint for this FHIR server.
                    // register	optional	valueUri indicating the OAuth2 dynamic registration endpoint for this FHIR server, if supported.
                    // manage	optional	valueUri indicating the user-facing authorization management workflow entry point for this FHIR server. Overview in this presentation.
            }, async(cfg, api) => {
                const response = await fetchConformance(cfg, api);

                let extensions;
                try {
                    console.log(response.body)
                    extensions = response.body.rest[0].security.extension.find(e => {
                        return e.url = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
                    }).extension;
                } catch (ex) {
                    throw new Error(`Unable to find security extensions at "${cfg.baseURL}/metadata"`);
                }

                // const extAuthorize = extensions.find(e => e.url === "authorize");
                // if (!extAuthorize || !extAuthorize.valueUri) {
                //     throw new Error(`Unable to find the "authorize" endpoint in the conformance statement`);
                // }

                const extToken = extensions.find(e => e.url === "token");
                if (!extToken || !extToken.valueUri) {
                    throw new Error(`Unable to find the "token" endpoint in the conformance statement`);
                }
            });
        });
    });
};
