import jose        from "node-jose"
import { expect }  from "@hapi/code"
import { getPath } from "./lib"
import ms          from "ms"
import { bdt }     from "../../types"


export default class Config
{
    private originalConfig: bdt.ServerConfig

    private normalizedConfig: bdt.NormalizedConfig

    private _capabilityStatement: bdt.FHIR.CapabilityStatement


    constructor(originalConfig: bdt.ServerConfig)
    {
        this.originalConfig = originalConfig
    }

    async normalize(signal?: AbortSignal): Promise<bdt.NormalizedConfig>
    {
        const out: Partial<bdt.NormalizedConfig> = {
            systemExportEndpoint: "",
            patientExportEndpoint: "",
            groupExportEndpoint: "",
            fastestResource: "Patient",
            supportedResourceTypes: ["Patient"],
            authentication: {
                type    : "none",
                optional: true,
                scope   : "system/*.read",
                tokenExpiresIn: "5m",
                tokenSignAlgorithm: "RS384",
                customTokenHeaders: {}
            },
            requests: {
                strictSSL: true,
                timeout: 10000,
                customHeaders: {}
            }
        };

        const options = this.originalConfig;

        const {
            baseURL,
            authentication: {
                type,
                optional,
                clientId,
                clientSecret,
                scope,
                tokenEndpoint,
                privateKey,
                customTokenHeaders,
                tokenSignAlgorithm,
                tokenExpiresIn,
                jwksUrl
            } = {
                type: "none"
            },
            requests: {
                strictSSL,
                timeout,
                customHeaders
            } = {}
        } = this.originalConfig


        // baseURL
        expect(baseURL, "options.baseURL must be a string").to.be.string()
        expect(baseURL, "options.baseURL must be an url").to.match(/^https?:\/\/.+/)
        out.baseURL = baseURL.trim().replace(/\/$/, "")

        // authentication -----------------------------------------------------

        // type
        expect(["backend-services", "client-credentials", "none"], "Unknown authentication.type option value").to.include(type)
        out.authentication.type = type

        // optional
        expect([undefined, true, false], "Unknown authentication.optional option value").to.include(optional)
        out.authentication.optional = !!optional

        // clientId
        if (out.authentication.type !== "none") {
            expect(clientId, "authentication.clientId must be a string").to.be.string()
            expect(clientId, "authentication.clientId must not be empty").to.not.be.empty()
            out.authentication.clientId = clientId
        }

        // clientSecret
        if (out.authentication.type === "client-credentials") {
            expect(clientSecret, "authentication.clientSecret must be a string").to.be.string()
            expect(clientSecret, "authentication.clientSecret must not be empty").to.not.be.empty()
            out.authentication.clientSecret = clientSecret
        }

        // scope
        if (scope) {
            expect(scope, "authentication.scope must be a string").to.be.string()
            out.authentication.scope = scope
        }

        // tokenEndpoint
        if (out.authentication.type !== "none") {
            if (tokenEndpoint) {
                expect(tokenEndpoint, "authentication.tokenEndpoint must be a string").to.be.string()
                expect(tokenEndpoint, "authentication.tokenEndpoint must be an url").to.match(/^https?:\/\/.+/)
                out.authentication.tokenEndpoint = tokenEndpoint.trim()
            } else {
                out.authentication.tokenEndpoint = await this.getTokenEndpoint(out, signal)
                expect(out.authentication.tokenEndpoint, "authentication.tokenEndpoint was not set and could not be auto-detected").to.be.string()
                expect(out.authentication.tokenEndpoint, "authentication.tokenEndpoint was not set and could not be auto-detected properly").to.match(/^https?:\/\/.+/)
            }
        }

        // privateKey
        if (out.authentication.type === "backend-services") {
            expect(privateKey, "authentication.privateKey must be set").to.not.be.undefined()
            expect(privateKey, "authentication.privateKey cannot be empty").to.not.be.empty()
            if (typeof privateKey === "string") {
                out.authentication.privateKey = await jose.JWK.asKey(privateKey, "pem")
            }
            else if (privateKey && typeof privateKey === "object") {
                out.authentication.privateKey = await jose.JWK.asKey(privateKey, "json")
            }
        }

        // customTokenHeaders
        if (customTokenHeaders) {
            expect(customTokenHeaders, "authentication.customTokenHeaders must be an object").to.be.an.object()
            out.authentication.customTokenHeaders = customTokenHeaders
        }

        // tokenSignAlgorithm
        if (tokenSignAlgorithm) {
            expect(tokenSignAlgorithm, "authentication.tokenSignAlgorithm must be a string").to.be.string()
            expect<string>(tokenSignAlgorithm, "authentication.tokenSignAlgorithm must not be \"none\"").to.not.equal("none")
            expect(
                ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
                "Invalid authentication.tokenSignAlgorithm option"
            ).to.include(tokenSignAlgorithm)
            out.authentication.tokenSignAlgorithm = tokenSignAlgorithm
        } else {
            out.authentication.tokenSignAlgorithm = out.authentication.privateKey?.alg as bdt.SupportedJWKAlgorithm
        }

        // tokenExpiresIn
        if (tokenExpiresIn) {
            expect(["string", "number"], "authentication.tokenExpiresIn must be a string or a number").to.include(typeof tokenExpiresIn)
            expect(tokenExpiresIn, "authentication.tokenExpiresIn must not be empty").to.not.be.empty()
            if (typeof tokenExpiresIn == "number") {
                expect(isNaN(tokenExpiresIn), "authentication.tokenExpiresIn must not be NaN").to.not.be.true()
                expect(isFinite(tokenExpiresIn), "authentication.tokenExpiresIn must not be finite").to.be.true()
            }
            out.authentication.tokenExpiresIn = tokenExpiresIn
        }

        // jwksUrl
        if (jwksUrl) {
            expect(jwksUrl, "authentication.jwksUrl must be a string").to.be.string()

            // jwksUrl must be on https but we allow http on localhost for dev
            if (!jwksUrl.match(/\/\/(localhost|127.0.0.1)(:\d+)?\//)) {
                expect(jwksUrl, "authentication.jwksUrl must be an https url").to.match(/^https:\/\/.+/)
            }
            out.authentication.jwksUrl = jwksUrl.trim()
        }

        // Requests -----------------------------------------------------------

        // strictSSL
        expect([undefined, true, false], "Unknown requests.strictSSL option value").to.include(strictSSL)
        out.requests.strictSSL = strictSSL !== false

        // customHeaders
        if (customHeaders) {
            expect(customHeaders, "The requests.customHeaders option must be an object").to.be.an.object()
            for(const key in customHeaders) {
                out.requests.customHeaders[key.toLowerCase()] = customHeaders[key]
            }
        }

        // timeout
        if (timeout) {
            expect(timeout, "The requests.timeout option must be a number").to.be.number()
            expect(timeout, "The requests.timeout option must be grater than 1000").to.be.above(1000)
            out.requests.timeout = timeout
        }


        // Other --------------------------------------------------------------

        // systemExportEndpoint
        if (options.systemExportEndpoint) {
            expect(options.systemExportEndpoint, "options.systemExportEndpoint must be a string").to.be.string()
            out.systemExportEndpoint = options.systemExportEndpoint
        } else {
            out.systemExportEndpoint = await this.getSystemExportEndpoint(out, signal)
        }

        // patientExportEndpoint
        if (options.patientExportEndpoint) {
            expect(options.patientExportEndpoint, "options.patientExportEndpoint must be a string").to.be.string()
            out.patientExportEndpoint = options.patientExportEndpoint
        } else {
            out.patientExportEndpoint = await this.getPatientExportEndpoint(out, signal)
        }

        // groupExportEndpoint
        if (options.groupExportEndpoint) {
            expect(options.groupExportEndpoint, "options.groupExportEndpoint must be a string").to.be.string()
            out.groupExportEndpoint = options.groupExportEndpoint
        }

        // supportedResourceTypes
        if (options.supportedResourceTypes) {
            expect(options.supportedResourceTypes, "options.supportedResourceTypes must be an array").to.be.an.array()
            expect<any[]>(options.supportedResourceTypes, "options.supportedResourceTypes must be an array of strings")
                .to.satisfy(types => types.every(x => typeof x === "string"))
            out.supportedResourceTypes = options.supportedResourceTypes
        } else {
            out.supportedResourceTypes = await this.getSupportedResourceTypes(out, signal)
        }

        // fastestResource
        if (options.fastestResource) {
            expect(options.fastestResource, "options.fastestResource must be a string").to.be.string()
            out.fastestResource = options.fastestResource
        } else {
            out.fastestResource = ["Organization", "Location", "Practitioner", "Patient"].find(r => {
                return out.supportedResourceTypes.indexOf(r) > -1
            }) || "Patient"
        }

        expect(
            out.groupExportEndpoint || out.patientExportEndpoint || out.systemExportEndpoint,
            "At least one export endpoint must be configured (groupExportEndpoint|patientExportEndpoint|systemExportEndpoint)"
        )

        return out as bdt.NormalizedConfig
    }

    private async getCapabilityStatement(options: Partial<bdt.NormalizedConfig>, signal?: AbortSignal)
    {
        if (this._capabilityStatement === undefined) {
            this._capabilityStatement = null

            const url = `${options.baseURL}/metadata?_format=json`
            try {

                const response = await fetch(url, {
                    signal,
                    headers: {
                        accept: "application/fhir+json,application/json+fhir,application/json"
                    }
                });

                const json = await response.json()
                this._capabilityStatement = json as bdt.FHIR.CapabilityStatement
            } catch (ex) {
                console.error(`Could not fetch the CapabilityStatement from ${url}: ${ex.message}`)
            }
        }
        return this._capabilityStatement
    }


    private getOperationDefinition(operations: any[], name: string, ref: string) {
        return operations.find((e: any) => {
            return e.name === name && (
                e.definition === ref ||
                e.definition?.reference === ref // Incorrect but needed for some servers
            );
        });
    }

    private async getTokenEndpoint(options: Partial<bdt.NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            const securityExtensions = getPath(capabilityStatement, "rest.0.security.extension") || [];
            const oauthUrisUrl = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
            const oauthUris = securityExtensions.find((ext: any) => ext.url === oauthUrisUrl);
            return oauthUris?.extension?.find((ext: any) => ext.url === "token")?.valueUri || "";
        }
        return ""
    }

    private async getSystemExportEndpoint(options: Partial<bdt.NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            const operations = getPath(capabilityStatement, "rest.0.operation") || [];
            return this.getOperationDefinition(operations, "export", "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/export") ? "$export" : "";
        }
        return ""
    }

    private async getPatientExportEndpoint(options: Partial<bdt.NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            let supported;
            try {
                const patient = capabilityStatement.rest[0].resource.find((x: any) => x.type === "Patient");
                supported = !!this.getOperationDefinition(patient.operation, "patient-export", "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/patient-export");
            } catch {
                supported = false;
            }
            return supported ? "Patient/$export" : "";
        }
        return ""
    }

    private async getSupportedResourceTypes(options: Partial<bdt.NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            return (capabilityStatement.rest[0].resource || []).map((x: any) => x.type);
        }
        return []
    }

    static async validate(cfg: Partial<bdt.ServerConfig>, signal?: AbortSignal) {

        if (signal?.aborted) {
            // @ts-ignore
            throw new DOMException(signal.reason || "Aborted", "AbortError");
        }
        
        // baseURL -------------------------------------------------------------
        expect(cfg, "The baseURL property is required").to.include("baseURL")
        expect(cfg.baseURL, "The baseURL property must be a string").to.be.string()
        expect(cfg.baseURL, "The baseURL property cannot be empty").to.not.be.empty()
    
        // systemExportEndpoint ------------------------------------------------
        if ("systemExportEndpoint" in cfg) {
            expect(!cfg.systemExportEndpoint || typeof cfg.systemExportEndpoint === "string", "The systemExportEndpoint property can either be falsy or non-empty string")
        }

        // patientExportEndpoint -----------------------------------------------
        if ("patientExportEndpoint" in cfg) {
            expect(!cfg.patientExportEndpoint || typeof cfg.patientExportEndpoint === "string", "The patientExportEndpoint property can either be falsy or non-empty string")
        }

        // groupExportEndpoint -------------------------------------------------
        if ("groupExportEndpoint" in cfg) {
            expect(!cfg.groupExportEndpoint || typeof cfg.groupExportEndpoint === "string", "The groupExportEndpoint property can either be falsy or non-empty string")
        }

        // Any export endpoint -------------------------------------------------
        // expect(
        //     !!(cfg.systemExportEndpoint || cfg.patientExportEndpoint || cfg.groupExportEndpoint),
        //     "No export endpoints defined. You need to set at least one of 'systemExportEndpoint', " +
        //     "'patientExportEndpoint' or 'groupExportEndpoint'."
        // ).to.be.true()

        // fastestResource -----------------------------------------------------
        if ("fastestResource" in cfg) {
            expect(cfg.fastestResource, "The fastestResource property must be a string").to.be.string()
            expect(cfg.fastestResource, "The fastestResource property cannot be empty").to.not.be.empty()
        }

        // supportedResourceTypes ----------------------------------------------
        if ("supportedResourceTypes" in cfg) {
            expect(cfg.supportedResourceTypes, "The supportedResourceTypes property must be an array").to.be.an.array()
            expect(cfg.supportedResourceTypes.length, "The supportedResourceTypes array must contain at least 2 resource types").to.be.greaterThan(1)
        }

        // requests ------------------------------------------------------------
        if ("requests" in cfg) {
            expect(cfg.requests, "If set, the requests property must be an object").to.be.an.object()
        }

        // authentication ------------------------------------------------------
        expect(cfg.authentication, "The 'authentication' property must be an object").to.be.an.object()
        expect(cfg.authentication, "The 'authentication' object cannot be empty").to.not.be.empty()

        // authentication.type -------------------------------------------------
        expect(cfg.authentication, "The 'authentication.type' option is required.").to.include("type")
        expect(
            ["backend-services", "client-credentials", "none"],
            "The 'authentication.type' option can only be 'backend-services', " +
            "'client-credentials' or 'none'."
        ).to.include(cfg.authentication.type)

        if (cfg.authentication.type !== "none") {
            
            // authentication.optional -----------------------------------------
            if ("optional" in cfg.authentication) {
                expect(cfg.authentication.optional, "The 'authentication.type' option must have a boolean value.").to.be.boolean()
            }

            // authentication.tokenEndpoint ------------------------------------
            if ("tokenEndpoint" in cfg.authentication) {
                expect(cfg.authentication.tokenEndpoint, "The authentication.tokenEndpoint property must be a string").to.be.string()
                expect(cfg.authentication.tokenEndpoint, "The authentication.tokenEndpoint property cannot be empty").to.not.be.empty()
            }

            // authentication.clientId -----------------------------------------
            expect(cfg.authentication, "The authentication.clientId property is required").to.include("clientId")
            expect(cfg.authentication.clientId, "The authentication.clientId property must be a string").to.be.string()
            expect(cfg.authentication.clientId, "The authentication.clientId property cannot be empty").to.not.be.empty()
        }

        if (cfg.authentication.type === "client-credentials") {

            // authentication.clientSecret -------------------------------------
            expect(cfg.authentication, "The authentication.clientSecret property is required").to.include("clientSecret")
            expect(cfg.authentication.clientSecret, "The authentication.clientSecret property must be a string").to.be.string()
            expect(cfg.authentication.clientSecret, "The authentication.clientSecret property cannot be empty").to.not.be.empty()
        }

        if (cfg.authentication.type === "backend-services") {
            
            // authentication.privateKey ---------------------------------------
            expect(cfg.authentication, "The authentication.privateKey property is required").to.include("privateKey")
            // expect(cfg.authentication.privateKey, "The authentication.privateKey property must be an object").to.be.an.object()
            expect(cfg.authentication.privateKey, "The authentication.privateKey property cannot be empty").to.not.be.empty()

            let privateKey;
            try {
                if (typeof cfg.authentication.privateKey === "string") {
                    privateKey = await jose.JWK.asKey(cfg.authentication.privateKey, "pem")
                }
                else if (cfg.authentication.privateKey && typeof cfg.authentication.privateKey === "object") {
                    privateKey = await jose.JWK.asKey(cfg.authentication.privateKey, "json")
                }
            } catch(ex) {
                throw new Error("The authentication.privateKey property does not appear to be a valid key. " + ex.message)
            }

            // expect(privateKey, "The authentication.privateKey property does not appear to be a JWK").to.include("alg")
            // expect(
            //     ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
            //     "Invalid authentication.privateKey.alg option"
            // ).to.include(privateKey.alg)

            // authentication.scope --------------------------------------------

            // authentication.customTokenClaims --------------------------------
            if ("customTokenClaims" in cfg.authentication) {
                expect(cfg.authentication.customTokenClaims, "If used, the authentication.customTokenClaims property must be an object").to.be.an.object()
                let keys = ["iss", "sub", "aud", "jti"];
                let ignored = Object.keys(cfg.authentication.customTokenClaims).find(key => {
                    return keys.indexOf(key) > -1
                });
                if (ignored) {
                    console.warn(
                        `The configuration property authentication.customTokenClaims.${
                        ignored} is not configurable and will be ignored`.yellow
                    )
                }
            }
        
            // authentication.customTokenHeaders -------------------------------
            if ("customTokenHeaders" in cfg.authentication) {
                expect(cfg.authentication.customTokenHeaders, "If used, the authentication.customTokenHeaders property must be an object").to.be.an.object()
                let keys = ["typ", "alg", "kty", "jku"];
                let ignored = Object.keys(cfg.authentication.customTokenHeaders).find(key => {
                    return keys.indexOf(key) > -1
                });
                if (ignored) {
                    console.warn(
                        `The configuration property authentication.customTokenHeaders.${
                        ignored} is not configurable and will be ignored`.yellow
                    )
                }
            }

            // authentication.tokenSignAlgorithm -------------------------------
            if ("tokenSignAlgorithm" in cfg.authentication) {
                expect(cfg.authentication.tokenSignAlgorithm, "authentication.tokenSignAlgorithm must be a string").to.be.string()
                expect<string>(cfg.authentication.tokenSignAlgorithm, "authentication.tokenSignAlgorithm must not be \"none\"").to.not.equal("none")
                expect(
                    ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
                    "Invalid authentication.tokenSignAlgorithm option"
                ).to.include(cfg.authentication.tokenSignAlgorithm)
            }

            // authentication.tokenExpiresIn -----------------------------------
            if (typeof cfg.authentication.tokenExpiresIn == "string") {
                expect(cfg.authentication.tokenExpiresIn, "authentication.tokenExpiresIn cannot be empty.").to.not.be.empty()
                expect(ms(cfg.authentication.tokenExpiresIn), "The authentication.tokenExpiresIn value is invalid").to.not.be.undefined()
                expect(ms(cfg.authentication.tokenExpiresIn), "The authentication.tokenExpiresIn value is invalid").to.be.greaterThan(0)
            }
            else if (typeof cfg.authentication.tokenExpiresIn == "number") {
                expect(cfg.authentication.tokenExpiresIn, "The authentication.tokenExpiresIn value is invalid").to.be.greaterThan(0)
            }

            // authentication.jwksUrl ------------------------------------------
            if ("jwksUrl" in cfg.authentication) {
                expect(cfg.authentication.jwksUrl, "If set, the authentication.jwksUrl property must be a string").to.be.string()
                expect(cfg.authentication.jwksUrl, "If set, the authentication.jwksUrl property cannot be empty").to.not.be.empty()
            }
        }
    }
}