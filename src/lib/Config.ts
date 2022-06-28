import jose        from "node-jose"
import { JWK as JoseJWK } from "node-jose"
import { expect }  from "@hapi/code"
import got         from "got/dist/source"
// import jwt         from "jsonwebtoken"
// import crypto      from "crypto"
import { getPath } from "./lib"
import {
    SupportedJWKAlgorithm,
    AuthTokenHeader,
    AuthTokenClaims
} from "./auth"
import { FHIR } from "./BulkDataClient"
import ms from "ms"

export interface AuthenticationOptions {

    /**
     * Can be:
     * - `backend-services` (*default*) all tests will be executed.
     * - `client-credentials` - uses client_id and client_secret. Most of the
     *    authorization tests will be skipped.
     * - `none` - no authorization will be performed and all the authorization 
     *    tests will be skipped.
     */
    type: "backend-services" | "client-credentials" | "none"

    /**
     * Set to true if auth if supported but not required
     */
    optional?: boolean

    /**
     * Required if authType is other than "none"
     */
    clientId?: string

    /**
     * Required if authType is set to "client-credentials"
     */
    clientSecret?: string
    
    /**
     * Not used if authType is set to "none"
     * Defaults to "system/*.read"
     */
    scope?: string

    /**
     * The full URL of the token endpoint. Required, unless authType is set
     * to "none"
     */
    tokenEndpoint?: string
    
    privateKey?: JoseJWK.Key

    /**
     * Custom values to be merged with the authentication token claims.
     * NOTE that the following cannot be overridden:
     * - `iss` (equals the clientId)
     * - `sub` (equals the clientId)
     * - `aud` (equals the tokenUrl)
     * - `jti` random value generated at runtime
     */ 
    customTokenClaims?: AuthTokenClaims
    
    /**
     * Custom properties to be merged with the authentication token
     * header before signing it.
     * NOTE that the following cannot be overridden:
     * - `typ` (equals "JWT")
     * - `alg` (@see `tokenSignAlgorithm` below)
     * - `kty` (equals the private key `kty`)
     * - `jku` (equals the current `jwks_url` if any)
     */
    customTokenHeaders?: AuthTokenHeader

    /**
     * The specifications states that:
     * > *The authentication JWT SHALL include the following claims, and
     *   SHALL be signed with the client’s private key (which **SHOULD
     *   be an RS384 or ES384 signature**).*
     * 
     * We sign with RS384 by default, but allow more!
     * Acceptable values are: RS256, RS384, RS512, ES256, ES384 and ES512
     */
    tokenSignAlgorithm?: SupportedJWKAlgorithm,

    /**
     * Expressed in seconds or a string describing a time span (Eg: `60`,
     * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
     * a seconds count. If you use a string be sure you provide the time
     * units (days, hours, etc), otherwise milliseconds unit is used by
     * default ("120" is equal to "120ms").
     * If not provided, we will use "5m" as default.
     * @see [zeit/ms](https://github.com/zeit/ms)
     */
    tokenExpiresIn?: string | number
    
    jwksUrl?: string
}

export interface ServerConfig {

    /**
     * FHIR server base URL.
     */
    baseURL: string

    /**
     * Authentication options
     */
    authentication: AuthenticationOptions

    requests: {
        strictSSL?: boolean
        timeout  ?: number
        customHeaders: Record<string, any>
    }

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export").
     */
    systemExportEndpoint?: string // will be auto-detected if not defined

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export").
     */
    patientExportEndpoint?: string // will be auto-detected if not defined

    /**
     * Set this to your group-level export endpoint to enable the group-level
     * tests. The value should be a path relative to the `baseURL` (typically
     * "Group/{GroupID}/$export"), where {GroupID} is the ID of the group you'd
     * like to to test.
     */
    groupExportEndpoint?: string

    fastestResource?: string
    
    supportedResourceTypes?: string[]
}

export interface NormalizedConfig {
    baseURL: string
    
    authentication: {
        type: "backend-services" | "client-credentials" | "none"
        optional: boolean
        // Required if authType is not set to "none"
        clientId?: string
        // Required if authType is set to "client-credentials"
        clientSecret?: string
        
        /**
         * Not used if authType is set to "none"
         * Defaults to "system/*.read"
         */
        scope: string

        /**
         * The full URL of the token endpoint. Required, unless authType is set
         * to "none"
         */
        tokenEndpoint?: string
        privateKey?: JoseJWK.Key

        /**
         * Custom values to be merged with the authentication token claims.
         * NOTE that the following cannot be overridden:
         * - `iss` (equals the clientId)
         * - `sub` (equals the clientId)
         * - `aud` (equals the tokenUrl)
         * - `jti` random value generated at runtime
         */ 
        customTokenClaims?: Record<string, any>
        
        /**
         * Custom properties to be merged with the authentication token
         * header before signing it.
         * NOTE that the following cannot be overridden:
         * - `typ` (equals "JWT")
         * - `alg` (@see `tokenSignAlgorithm` below)
         * - `kty` (equals the private key `kty`)
         * - `jku` (equals the current `jwks_url` if any)
         */
        customTokenHeaders?: Record<string, any>

        /**
         * The specifications states that:
         * > *The authentication JWT SHALL include the following claims, and
         *   SHALL be signed with the client’s private key (which **SHOULD
         *   be an RS384 or ES384 signature**).*
         * 
         * We sign with RS384 by default, but allow other algorithms for
         * servers that are not yet fully compliant
         */
        tokenSignAlgorithm?: SupportedJWKAlgorithm,

        /**
         * Expressed in seconds or a string describing a time span (Eg: `60`,
         * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
         * a seconds count. If you use a string be sure you provide the time
         * units (days, hours, etc), otherwise milliseconds unit is used by
         * default ("120" is equal to "120ms").
         * If not provided, we will use "5m" as default.
         * @see [zeit/ms](https://github.com/zeit/ms)
         */
        tokenExpiresIn?: string | number
        
        jwksUrl?: string
    }

    requests: {
        strictSSL: boolean
        customHeaders: Record<string, any>
        timeout: number
    }

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export").
     */
    systemExportEndpoint?: string // will be auto-detected if not defined

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export").
     */
    patientExportEndpoint?: string // will be auto-detected if not defined

    /**
     * Set this to your group-level export endpoint to enable the group-level
     * tests. The value should be a path relative to the `baseURL` (typically
     * "Group/{GroupID}/$export"), where {GroupID} is the ID of the group you'd
     * like to to test.
     */
    groupExportEndpoint?: string

    fastestResource: string

    supportedResourceTypes: string[]
}

export default class Config
{
    private originalConfig: ServerConfig

    private normalizedConfig: NormalizedConfig

    private _capabilityStatement: FHIR.CapabilityStatement

    constructor(originalConfig: ServerConfig)
    {
        this.originalConfig = originalConfig
    }

    async normalize(signal?: AbortSignal): Promise<NormalizedConfig>
    {
        const out: Partial<NormalizedConfig> = {
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
            out.authentication.tokenSignAlgorithm = out.authentication.privateKey?.alg as SupportedJWKAlgorithm
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
            expect(jwksUrl, "authentication.jwksUrl must be an https url").to.match(/^https:\/\/.+/)
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

        return out as NormalizedConfig
    }

    private async getCapabilityStatement(options: Partial<NormalizedConfig>, signal?: AbortSignal)
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
                this._capabilityStatement = json as FHIR.CapabilityStatement
            } catch (ex) {
                console.error(`Could not fetch the CapabilityStatement from ${url}: ${ex.message}`)
            }
        }
        return this._capabilityStatement
    }

    private async getTokenEndpoint(options: Partial<NormalizedConfig>, signal?: AbortSignal)
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

    private async getSystemExportEndpoint(options: Partial<NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            const operations = getPath(capabilityStatement, "rest.0.operation") || [];

            const definition = operations.find((e: any) => (
                e.name === "export" &&
                e.definition === "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/export"    
            ));
            return definition ? "$export" : ""
        }
        return ""
    }

    private async getPatientExportEndpoint(options: Partial<NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            let supported;
            try {
                supported = !!capabilityStatement.rest[0].resource.find(
                    (x: any) => x.type === "Patient"
                ).operation.find((x: any) => (
                    x.name === "patient-export" &&
                    x.definition === "http://hl7.org/fhir/uv/bulkdata/OperationDefinition/patient-export"
                ));
            } catch {
                supported = false;
            }
            return supported ? "Patient/$export" : "";
        }
        return ""
    }

    private async getSupportedResourceTypes(options: Partial<NormalizedConfig>, signal?: AbortSignal)
    {
        const capabilityStatement = await this.getCapabilityStatement(options, signal);
        if (capabilityStatement) {
            return (capabilityStatement.rest[0].resource || []).map((x: any) => x.type);
        }
        return []
    }

    static async validate(cfg: Partial<ServerConfig>) {
        
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