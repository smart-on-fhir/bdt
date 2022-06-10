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
const ms_1 = __importDefault(require("ms"));
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
        else {
            out.authentication.tokenSignAlgorithm = out.authentication.privateKey?.alg;
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
    static async validate(cfg) {
        // baseURL -------------------------------------------------------------
        code_1.expect(cfg, "The baseURL property is required").to.include("baseURL");
        code_1.expect(cfg.baseURL, "The baseURL property must be a string").to.be.string();
        code_1.expect(cfg.baseURL, "The baseURL property cannot be empty").to.not.be.empty();
        // systemExportEndpoint ------------------------------------------------
        if ("systemExportEndpoint" in cfg) {
            code_1.expect(!cfg.systemExportEndpoint || typeof cfg.systemExportEndpoint === "string", "The systemExportEndpoint property can either be falsy or non-empty string");
        }
        // patientExportEndpoint -----------------------------------------------
        if ("patientExportEndpoint" in cfg) {
            code_1.expect(!cfg.patientExportEndpoint || typeof cfg.patientExportEndpoint === "string", "The patientExportEndpoint property can either be falsy or non-empty string");
        }
        // groupExportEndpoint -------------------------------------------------
        if ("groupExportEndpoint" in cfg) {
            code_1.expect(!cfg.groupExportEndpoint || typeof cfg.groupExportEndpoint === "string", "The groupExportEndpoint property can either be falsy or non-empty string");
        }
        // Any export endpoint -------------------------------------------------
        // expect(
        //     !!(cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint),
        //     "No export endpoints defined. You need to set at least one of 'systemExportEndpoint', " +
        //     "'patientExportEndpoint' or 'groupExportEndpoint'."
        // ).to.be.true()
        // fastestResource -----------------------------------------------------
        if ("fastestResource" in cfg) {
            code_1.expect(cfg.fastestResource, "The fastestResource property must be a string").to.be.string();
            code_1.expect(cfg.fastestResource, "The fastestResource property cannot be empty").to.not.be.empty();
        }
        // supportedResourceTypes ----------------------------------------------
        if ("supportedResourceTypes" in cfg) {
            code_1.expect(cfg.supportedResourceTypes, "The supportedResourceTypes property must be an array").to.be.an.array();
            code_1.expect(cfg.supportedResourceTypes.length, "The supportedResourceTypes array must contain at least 2 resource types").to.be.greaterThan(1);
        }
        // requests ------------------------------------------------------------
        if ("requests" in cfg) {
            code_1.expect(cfg.requests, "If set, the requests property must be an object").to.be.an.object();
        }
        // authentication ------------------------------------------------------
        code_1.expect(cfg.authentication, "The 'authentication' property must be an object").to.be.an.object();
        code_1.expect(cfg.authentication, "The 'authentication' object cannot be empty").to.not.be.empty();
        // authentication.type -------------------------------------------------
        code_1.expect(cfg.authentication, "The 'authentication.type' option is required.").to.include("type");
        code_1.expect(["backend-services", "client-credentials", "none"], "The 'authentication.type' option can only be 'backend-services', " +
            "'client-credentials' or 'none'.").to.include(cfg.authentication.type);
        if (cfg.authentication.type !== "none") {
            // authentication.optional -----------------------------------------
            if ("optional" in cfg.authentication) {
                code_1.expect(cfg.authentication.optional, "The 'authentication.type' option must have a boolean value.").to.be.boolean();
            }
            // authentication.tokenEndpoint ------------------------------------
            if ("tokenEndpoint" in cfg.authentication) {
                code_1.expect(cfg.authentication.tokenEndpoint, "The authentication.tokenEndpoint property must be a string").to.be.string();
                code_1.expect(cfg.authentication.tokenEndpoint, "The authentication.tokenEndpoint property cannot be empty").to.not.be.empty();
            }
            // authentication.clientId -----------------------------------------
            code_1.expect(cfg.authentication, "The authentication.clientId property is required").to.include("clientId");
            code_1.expect(cfg.authentication.clientId, "The authentication.clientId property must be a string").to.be.string();
            code_1.expect(cfg.authentication.clientId, "The authentication.clientId property cannot be empty").to.not.be.empty();
        }
        if (cfg.authentication.type === "client-credentials") {
            // authentication.clientSecret -------------------------------------
            code_1.expect(cfg.authentication, "The authentication.clientSecret property is required").to.include("clientSecret");
            code_1.expect(cfg.authentication.clientSecret, "The authentication.clientSecret property must be a string").to.be.string();
            code_1.expect(cfg.authentication.clientSecret, "The authentication.clientSecret property cannot be empty").to.not.be.empty();
        }
        if (cfg.authentication.type === "backend-services") {
            // authentication.privateKey ---------------------------------------
            code_1.expect(cfg.authentication, "The authentication.privateKey property is required").to.include("privateKey");
            // expect(cfg.authentication.privateKey, "The authentication.privateKey property must be an object").to.be.an.object()
            code_1.expect(cfg.authentication.privateKey, "The authentication.privateKey property cannot be empty").to.not.be.empty();
            let privateKey;
            try {
                if (typeof cfg.authentication.privateKey === "string") {
                    privateKey = await node_jose_1.default.JWK.asKey(cfg.authentication.privateKey, "pem");
                }
                else if (cfg.authentication.privateKey && typeof cfg.authentication.privateKey === "object") {
                    privateKey = await node_jose_1.default.JWK.asKey(cfg.authentication.privateKey, "json");
                }
            }
            catch (ex) {
                throw new Error("The authentication.privateKey property does not appear to be a valid key. " + ex.message);
            }
            // expect(privateKey, "The authentication.privateKey property does not appear to be a JWK").to.include("alg")
            // expect(
            //     ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
            //     "Invalid authentication.privateKey.alg option"
            // ).to.include(privateKey.alg)
            // authentication.scope --------------------------------------------
            // authentication.customTokenClaims --------------------------------
            if ("customTokenClaims" in cfg.authentication) {
                code_1.expect(cfg.authentication.customTokenClaims, "If used, the authentication.customTokenClaims property must be an object").to.be.an.object();
                let keys = ["iss", "sub", "aud", "jti"];
                let ignored = Object.keys(cfg.authentication.customTokenClaims).find(key => {
                    return keys.indexOf(key) > -1;
                });
                if (ignored) {
                    console.warn(`The configuration property authentication.customTokenClaims.${ignored} is not configurable and will be ignored`.yellow);
                }
            }
            // authentication.customTokenHeaders -------------------------------
            if ("customTokenHeaders" in cfg.authentication) {
                code_1.expect(cfg.authentication.customTokenHeaders, "If used, the authentication.customTokenHeaders property must be an object").to.be.an.object();
                let keys = ["typ", "alg", "kty", "jku"];
                let ignored = Object.keys(cfg.authentication.customTokenHeaders).find(key => {
                    return keys.indexOf(key) > -1;
                });
                if (ignored) {
                    console.warn(`The configuration property authentication.customTokenHeaders.${ignored} is not configurable and will be ignored`.yellow);
                }
            }
            // authentication.tokenSignAlgorithm -------------------------------
            if ("tokenSignAlgorithm" in cfg.authentication) {
                code_1.expect(cfg.authentication.tokenSignAlgorithm, "authentication.tokenSignAlgorithm must be a string").to.be.string();
                code_1.expect(cfg.authentication.tokenSignAlgorithm, "authentication.tokenSignAlgorithm must not be \"none\"").to.not.equal("none");
                code_1.expect(['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'], "Invalid authentication.tokenSignAlgorithm option").to.include(cfg.authentication.tokenSignAlgorithm);
            }
            // authentication.tokenExpiresIn -----------------------------------
            if (typeof cfg.authentication.tokenExpiresIn == "string") {
                code_1.expect(cfg.authentication.tokenExpiresIn, "authentication.tokenExpiresIn cannot be empty.").to.not.be.empty();
                code_1.expect(ms_1.default(cfg.authentication.tokenExpiresIn), "The authentication.tokenExpiresIn value is invalid").to.not.be.undefined();
                code_1.expect(ms_1.default(cfg.authentication.tokenExpiresIn), "The authentication.tokenExpiresIn value is invalid").to.be.greaterThan(0);
            }
            else if (typeof cfg.authentication.tokenExpiresIn == "number") {
                code_1.expect(cfg.authentication.tokenExpiresIn, "The authentication.tokenExpiresIn value is invalid").to.be.greaterThan(0);
            }
            // authentication.jwksUrl ------------------------------------------
            if ("jwksUrl" in cfg.authentication) {
                code_1.expect(cfg.authentication.jwksUrl, "If set, the authentication.jwksUrl property must be a string").to.be.string();
                code_1.expect(cfg.authentication.jwksUrl, "If set, the authentication.jwksUrl property cannot be empty").to.not.be.empty();
            }
        }
    }
}
exports.default = Config;
//# sourceMappingURL=Config.js.map