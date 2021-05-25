"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_jose_1 = __importDefault(require("node-jose"));
const code_1 = require("@hapi/code");
const source_1 = __importDefault(require("got/dist/source"));
// import jwt         from "jsonwebtoken"
// import crypto      from "crypto"
const lib_1 = require("./lib");
class Config {
    constructor(originalConfig) {
        this.originalConfig = originalConfig;
    }
    async normalize() {
        const out = {
            systemExportEndpoint: "",
            patientExportEndpoint: "",
            groupExportEndpoint: "",
            fastestResource: "Patient",
            supportedResourceTypes: ["Patient"],
            authentication: {
                type: "none",
                optional: true,
                scope: "system/*.read",
                tokenExpiresIn: "5m",
                tokenSignAlgorithm: "RS384",
                customTokenHeaders: {}
            },
            requests: {
                strictSSL: true,
                timeout: 5000,
                customHeaders: {}
            }
        };
        const options = this.originalConfig;
        const { baseURL, authentication: { type, optional, clientId, clientSecret, scope, tokenEndpoint, privateKey, customTokenHeaders, tokenSignAlgorithm, tokenExpiresIn, jwksUrl } = {
            type: "none"
        }, requests: { strictSSL, timeout, customHeaders } = {} } = this.originalConfig;
        // baseURL
        code_1.expect(baseURL, "options.baseURL must be a string").to.be.string();
        code_1.expect(baseURL, "options.baseURL must be an url").to.match(/^https?:\/\/.+/);
        out.baseURL = baseURL.trim().replace(/\/$/, "");
        // authentication -----------------------------------------------------
        // type
        code_1.expect(["backend-services", "client-credentials", "none"], "Unknown authentication.type option value").to.include(type);
        out.authentication.type = type;
        // optional
        code_1.expect([undefined, true, false], "Unknown authentication.optional option value").to.include(optional);
        out.authentication.optional = !!optional;
        // clientId
        if (out.authentication.type !== "none") {
            code_1.expect(clientId, "authentication.clientId must be a string").to.be.string();
            code_1.expect(clientId, "authentication.clientId must not be empty").to.not.be.empty();
            out.authentication.clientId = clientId;
        }
        // clientSecret
        if (out.authentication.type === "client-credentials") {
            code_1.expect(clientSecret, "authentication.clientSecret must be a string").to.be.string();
            code_1.expect(clientSecret, "authentication.clientSecret must not be empty").to.not.be.empty();
            out.authentication.clientSecret = clientSecret;
        }
        // scope
        if (scope) {
            code_1.expect(scope, "authentication.scope must be a string").to.be.string();
            out.authentication.scope = scope;
        }
        // tokenEndpoint
        if (out.authentication.type !== "none") {
            if (tokenEndpoint) {
                code_1.expect(tokenEndpoint, "authentication.tokenEndpoint must be a string").to.be.string();
                code_1.expect(tokenEndpoint, "authentication.tokenEndpoint must be an url").to.match(/^https?:\/\/.+/);
                out.authentication.tokenEndpoint = tokenEndpoint.trim();
            }
            else {
                out.authentication.tokenEndpoint = await this.getTokenEndpoint(out);
                code_1.expect(out.authentication.tokenEndpoint, "authentication.tokenEndpoint was not set and could not be auto-detected").to.be.string();
                code_1.expect(out.authentication.tokenEndpoint, "authentication.tokenEndpoint was not set and could not be auto-detected properly").to.match(/^https?:\/\/.+/);
            }
        }
        // privateKey
        if (out.authentication.type === "backend-services") {
            code_1.expect(privateKey, "authentication.privateKey must be set").to.not.be.undefined();
            code_1.expect(privateKey, "authentication.privateKey cannot be empty").to.not.be.empty();
            if (typeof privateKey === "string") {
                out.authentication.privateKey = await node_jose_1.default.JWK.asKey(privateKey, "pem");
            }
            else if (privateKey && typeof privateKey === "object") {
                out.authentication.privateKey = await node_jose_1.default.JWK.asKey(privateKey, "json");
            }
        }
        // customTokenHeaders
        if (customTokenHeaders) {
            code_1.expect(customTokenHeaders, "authentication.customTokenHeaders must be an object").to.be.an.object();
            out.authentication.customTokenHeaders = customTokenHeaders;
        }
        // tokenSignAlgorithm
        if (tokenSignAlgorithm) {
            code_1.expect(tokenSignAlgorithm, "authentication.tokenSignAlgorithm must be a string").to.be.string();
            code_1.expect(tokenSignAlgorithm, "authentication.tokenSignAlgorithm must not be \"none\"").to.not.equal("none");
            code_1.expect(['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'], "Invalid authentication.tokenSignAlgorithm option").to.include(tokenSignAlgorithm);
            out.authentication.tokenSignAlgorithm = tokenSignAlgorithm;
        }
        // tokenExpiresIn
        if (tokenExpiresIn) {
            code_1.expect(["string", "number"], "authentication.tokenExpiresIn must be a string or a number").to.include(typeof tokenExpiresIn);
            code_1.expect(tokenExpiresIn, "authentication.tokenExpiresIn must not be empty").to.not.be.empty();
            if (typeof tokenExpiresIn == "number") {
                code_1.expect(isNaN(tokenExpiresIn), "authentication.tokenExpiresIn must not be NaN").to.not.be.true();
                code_1.expect(isFinite(tokenExpiresIn), "authentication.tokenExpiresIn must not be finite").to.be.true();
            }
            out.authentication.tokenExpiresIn = tokenExpiresIn;
        }
        // jwksUrl
        if (jwksUrl) {
            code_1.expect(jwksUrl, "authentication.jwksUrl must be a string").to.be.string();
            code_1.expect(jwksUrl, "authentication.jwksUrl must be an https url").to.match(/^https:\/\/.+/);
            out.authentication.jwksUrl = jwksUrl.trim();
        }
        // Requests -----------------------------------------------------------
        // strictSSL
        code_1.expect([undefined, true, false], "Unknown requests.strictSSL option value").to.include(strictSSL);
        out.requests.strictSSL = strictSSL !== false;
        // customHeaders
        if (customHeaders) {
            code_1.expect(customHeaders, "The requests.customHeaders option must be an object").to.be.an.object();
            for (const key in customHeaders) {
                out.requests.customHeaders[key.toLowerCase()] = customHeaders[key];
            }
        }
        // timeout
        if (timeout) {
            code_1.expect(timeout, "The requests.timeout option must be a number").to.be.number();
            code_1.expect(timeout, "The requests.timeout option must be grater than 1000").to.be.above(1000);
            out.requests.timeout = timeout;
        }
        // Other --------------------------------------------------------------
        // systemExportEndpoint
        if (options.systemExportEndpoint) {
            code_1.expect(options.systemExportEndpoint, "options.systemExportEndpoint must be a string").to.be.string();
            out.systemExportEndpoint = options.systemExportEndpoint;
        }
        else {
            out.systemExportEndpoint = await this.getSystemExportEndpoint(out);
        }
        // patientExportEndpoint
        if (options.patientExportEndpoint) {
            code_1.expect(options.patientExportEndpoint, "options.patientExportEndpoint must be a string").to.be.string();
            out.patientExportEndpoint = options.patientExportEndpoint;
        }
        else {
            out.patientExportEndpoint = await this.getPatientExportEndpoint(out);
        }
        // groupExportEndpoint
        if (options.groupExportEndpoint) {
            code_1.expect(options.groupExportEndpoint, "options.groupExportEndpoint must be a string").to.be.string();
            out.groupExportEndpoint = options.groupExportEndpoint;
        }
        else if (options.groupId) {
            code_1.expect(options.groupId, "options.groupId must be a string").to.be.string();
            out.groupExportEndpoint = await this.getGroupExportEndpoint(out, options.groupId);
        }
        // supportedResourceTypes
        if (options.supportedResourceTypes) {
            code_1.expect(options.supportedResourceTypes, "options.supportedResourceTypes must be an array").to.be.an.array();
            code_1.expect(options.supportedResourceTypes, "options.supportedResourceTypes must be an array of strings")
                .to.satisfy(types => types.every(x => typeof x === "string"));
            out.supportedResourceTypes = options.supportedResourceTypes;
        }
        else {
            out.supportedResourceTypes = await this.getSupportedResourceTypes(out);
        }
        // fastestResource
        if (options.fastestResource) {
            code_1.expect(options.fastestResource, "options.fastestResource must be a string").to.be.string();
            out.fastestResource = options.fastestResource;
        }
        else {
            out.fastestResource = ["Organization", "Location", "Practitioner", "Patient"].find(r => {
                return out.supportedResourceTypes.indexOf(r) > -1;
            }) || "Patient";
        }
        code_1.expect(out.groupExportEndpoint || out.patientExportEndpoint || out.systemExportEndpoint, "At least one export endpoint must be configured (groupExportEndpoint|patientExportEndpoint|systemExportEndpoint)");
        return out;
    }
    async getCapabilityStatement(options) {
        if (this._capabilityStatement === undefined) {
            try {
                this._capabilityStatement = await source_1.default({
                    url: `${options.baseURL}/metadata?_format=json`,
                    https: {
                        rejectUnauthorized: false
                    },
                    headers: {
                        accept: "application/fhir+json,application/json+fhir,application/json"
                    }
                }).json();
            }
            catch (ex) {
                this._capabilityStatement = null;
                console.error(`Could not fetch the CapabilityStatement from ${options.baseURL}/metadata?_format=json. ${ex.message}`);
                // ex.message = `Could not fetch the CapabilityStatement from ${options.baseURL}/metadata?_format=json. ${ex.message}`
                // throw ex
            }
        }
        return this._capabilityStatement;
    }
    async getTokenEndpoint(options) {
        const capabilityStatement = await this.getCapabilityStatement(options);
        if (capabilityStatement) {
            const securityExtensions = lib_1.getPath(capabilityStatement, "rest.0.security.extension") || [];
            const oauthUrisUrl = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
            const oauthUris = securityExtensions.find((ext) => ext.url === oauthUrisUrl);
            return oauthUris?.extension?.find((ext) => ext.url === "token")?.valueUri || "";
        }
        return "";
    }
    async getSystemExportEndpoint(options) {
        const capabilityStatement = await this.getCapabilityStatement(options);
        if (capabilityStatement) {
            const operations = lib_1.getPath(capabilityStatement, "rest.0.operation") || [];
            const definition = operations.find((e) => (e.name === "export" &&
                e.definition === "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/export"));
            return definition ? "$export" : "";
        }
        return "";
    }
    async getGroupExportEndpoint(options, groupId) {
        const capabilityStatement = await this.getCapabilityStatement(options);
        if (capabilityStatement) {
            let supported;
            try {
                supported = !!capabilityStatement.rest[0].resource.find((x) => x.type === "Group").operation.find((x) => (x.name === "group-export" &&
                    x.definition === "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/group-export"));
            }
            catch {
                supported = false;
            }
            return supported ? `Group/${groupId}/$export` : "";
        }
        return "";
    }
    async getPatientExportEndpoint(options) {
        const capabilityStatement = await this.getCapabilityStatement(options);
        if (capabilityStatement) {
            let supported;
            try {
                supported = !!capabilityStatement.rest[0].resource.find((x) => x.type === "Patient").operation.find((x) => (x.name === "patient-export" &&
                    x.definition === "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/patient-export"));
            }
            catch {
                supported = false;
            }
            return supported ? "Patient/$export" : "";
        }
        return "";
    }
    async getSupportedResourceTypes(options) {
        const capabilityStatement = await this.getCapabilityStatement(options);
        if (capabilityStatement) {
            return (capabilityStatement.rest[0].resource || []).map((x) => x.type);
        }
        return [];
    }
}
exports.default = Config;
//# sourceMappingURL=Config.js.map