"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const code_1 = require("@hapi/code");
const BulkDataClient_1 = require("../lib/BulkDataClient");
suite("Metadata", () => {
    suite("CapabilityStatement", () => {
        test({
            name: "The CapabilityStatement instantiates the bulk-data CapabilityStatement",
            description: "To declare conformance with this IG, a server should include " +
                "the following URL in its own `CapabilityStatement.instantiates`: \n" +
                "[http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data]" +
                "(http://www.hl7.org/fhir/bulk-data/CapabilityStatement-bulk-data.html).\n" +
                "The CapabilityStatement should contain something like this:\n" +
                "```json\n\"instantiates\": [\n" +
                '    "http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data"\n' +
                "]\n```"
        }, async ({ config, api }) => {
            const client = new BulkDataClient_1.BulkDataClient(config, api);
            const stmt = await client.getCapabilityStatement();
            try {
                code_1.expect(stmt.instantiates.indexOf("http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data")).to.be.greaterThan(-1);
            }
            catch (ex) {
                api.console.warn("http://hl7.org/fhir/uv/bulkdata/CapabilityStatement/bulk-data was not found in CapabilityStatement.instantiates");
            }
        });
        test({
            name: 'Includes the token endpoint in the CapabilityStatement',
            description: "If a server requires SMART on FHIR authorization " +
                "for access, its metadata **must** support automated discovery " +
                "of OAuth2 endpoints by including a \"complex\" extension " +
                "(that is, an extension with multiple components inside) " +
                "on the `CapabilityStatement.rest.security` element. Any " +
                "time a client sees this extension, it must be prepared to " +
                "authorize using SMART's OAuth2-based protocol.\n" +
                "This test is expecting to find in the `CapabilityStatement` " +
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
                ']\n```'
        }, async ({ config, api }) => {
            const client = new BulkDataClient_1.BulkDataClient(config, api);
            const stmt = await client.getCapabilityStatement();
            // If the server requires authorization, then the security extensions MUST be defined.
            let extensions;
            try {
                extensions = stmt.rest[0].security.extension.find((e) => {
                    return e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
                }).extension;
            }
            catch (ex) {
                throw new Error(`Unable to find security extensions at "${config.baseURL}/metadata"`);
            }
            // If a CapabilityStatement was found and if the server requires
            // authorization, then the token endpoint MUST be defined.
            const extToken = extensions.find((e) => e.url === "token");
            if (!extToken || !extToken.valueUri) {
                throw new Error(`Unable to find the "token" endpoint in the conformance statement`);
            }
        });
        test({
            name: `Check if "export" operation is defined in the CapabilityStatement`,
            description: "This test expects to find in the CapabilityStatement " +
                'an entry like:\n```\n"rest": [\n' +
                '  {\n' +
                '    "operation": [\n' +
                '      {\n' +
                '        "name" : "export",\n' +
                '        "definition": "..."\n' +
                '      }\n' +
                '    ]\n' +
                '  }\n' +
                ']\n```'
        }, async ({ config, api }) => {
            const client = new BulkDataClient_1.BulkDataClient(config, api);
            const stmt = await client.getCapabilityStatement();
            try {
                let operation = stmt.rest[0].operation.find((e) => e.name === "export");
                if (!operation) {
                    throw new Error();
                }
            }
            catch (ex) {
                throw new Error(`Unable to find "export" operation at "${config.baseURL}/metadata"`);
            }
        });
        test({
            name: `Check if "patient-export" operation is defined in the CapabilityStatement`,
            description: "This test expects to find in the CapabilityStatement " +
                'an entry like:\n```\n"rest": [\n' +
                '  {\n' +
                '    "resource": [\n' +
                '      {\n' +
                '        "type": "Patient",\n' +
                '        "operation": [\n' +
                '          {\n' +
                '            "name" : "patient-export",\n' +
                '            "definition": "..."\n' +
                '          }\n' +
                '        ]\n' +
                '      }\n' +
                '    ]\n' +
                '  }\n' +
                ']\n```'
        }, async ({ config, api }) => {
            const client = new BulkDataClient_1.BulkDataClient(config, api);
            const stmt = await client.getCapabilityStatement();
            try {
                let patient = stmt.rest[0].resource.find((r) => r.type.toLowerCase() == "patient");
                let operation = patient.operation.find((e) => e.name === "patient-export");
                if (!operation) {
                    throw new Error();
                }
            }
            catch (ex) {
                throw new Error(`Unable to find "export" operation at "${config.baseURL}/metadata"`);
            }
        });
        test({
            name: `Check if "group-export" operation is defined in the CapabilityStatement`,
            description: "This test expects to find in the CapabilityStatement " +
                'an entry like:\n```\n"rest": [\n' +
                '  {\n' +
                '    "resource": [\n' +
                '      {\n' +
                '        "type": "Group",\n' +
                '        "operation": [\n' +
                '          {\n' +
                '            "name" : "group-export",\n' +
                '            "definition": "..."\n' +
                '          }\n' +
                '        ]\n' +
                '      }\n' +
                '    ]\n' +
                '  }\n' +
                ']\n```'
        }, async ({ config, api }) => {
            const client = new BulkDataClient_1.BulkDataClient(config, api);
            const stmt = await client.getCapabilityStatement();
            try {
                let group = stmt.rest[0].resource.find((r) => r.type.toLowerCase() == "group");
                let operation = group.operation.find((e) => e.name === "group-export");
                if (!operation) {
                    throw new Error();
                }
            }
            catch (ex) {
                throw new Error(`Unable to find "group-export" operation at "${config.baseURL}/metadata"`);
            }
        });
    });
    suite("Well Known SMART Configuration", () => {
        test({
            name: "Includes token_endpoint definition",
            description: 'This test verifies that the server provides a ' +
                '`/.well-known/smart-configuration` and that ' +
                'a `token_endpoint` property is declared ' +
                'within that file.'
        }, async ({ config, api }) => {
            const client = new BulkDataClient_1.BulkDataClient(config, api);
            const { response, body } = await client.request({
                url: ".well-known/smart-configuration",
                responseType: "json",
                requestLabel: ".well-known/smart-configuration request",
                responseLabel: ".well-known/smart-configuration response",
                skipAuth: true
            });
            // Having a WellKnown JSON is optional but we show a warning if
            // it is missing.
            if (response.statusCode === 404) {
                return api.console.warn(`No WellKnown JSON found at "${config.baseURL}/.well-known/smart-configuration"`);
            }
            // If WellKnown JSON is found, then it must include the 
            // "token_endpoint" property
            try {
                code_1.expect(body).to.include("token_endpoint");
            }
            catch (ex) {
                throw new Error('The WellKnown JSON did not include a "token_endpoint" declaration');
            }
        });
    });
});
//# sourceMappingURL=metadata.test.js.map