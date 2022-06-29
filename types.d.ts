import { Response } from "got"
import jose from "node-jose"
import { TestAPI } from "./src/lib/TestAPI"
// import BDT from "./src/lib/bdt"

export namespace bdt {

    type JSONScalar = string | number | boolean | null;
    type JSONArray  = JSONValue[];
    type JSONObject = { [ key: string ]: JSONValue };
    type JSONValue  = JSONScalar | JSONArray | JSONObject;

    interface StdOutReporterOptions {
        wrap?: number
        colors?: boolean
        verbose?: "always" | "never" | "auto"
    }

    type SupportedJWKAlgorithm = 'RS256'|'RS384'|'RS512'|'ES256'|'ES384'|'ES512'

    interface AuthTokenClaims extends Record<string, any> {
        iss?: string
        sub?: string
        aud?: string
        jti?: string
    }

    interface AuthTokenHeader extends Record<string, any> {
        typ?: string
        alg?: string
        kty?: string
        jku?: string
    }

    interface createAuthTokenOptions {
        tokenEndpoint: string
        clientId: string
        privateKey: jose.JWK.Key

        /**
         * The algorithm to sign with.
         * If not provided, the `alg` property of the `privateKey`
         * will be used, if it exists and if the private key is JWK.
         * Otherwise an exception is thrown.
         * 
         * The specifications recommends **RS384** or **ES384** but
         * we allow more.
         * 
         * @see [[SupportedJWKAlgorithm]] for acceptable values
         */
        algorithm?: SupportedJWKAlgorithm

        /**
         * Any properties to add to the token header.
         * 
         * **WARNING**: because test would want to mess with the
         * tokens to see if the server would detect that, we allow every
         * single header property to be overridden. For successful
         * authentication avoid setting these in the header:
         * - typ
         * - alg
         * - kty
         * - jku
         */
        header?: AuthTokenHeader

        /**
         * Any properties to add to the token claims.
         * 
         * **WARNING**: because test would want to mess with the
         * tokens to see if the server would detect, we allow every
         * single claim to be overridden. However, for successful
         * authentication avoid setting these claims:
         * - iss
         * - sub
         * - aud
         * - jti
         */
        claims?: AuthTokenClaims

        /**
         * The https URL where the public keys can be located
         * Only used for JWKS URL auth
         */
        jwksUrl?: string

        /**
         * Expressed in seconds or a string describing a time span (Eg: `60`,
         * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
         * a seconds count. If you use a string be sure you provide the time
         * units (days, hours, etc), otherwise milliseconds unit is used by
         * default ("120" is equal to "120ms").
         * If not provided, we will use "5m" as default.
         * @see [zeit/ms](https://github.com/zeit/ms)
         */
        expiresIn ?: string | number
    }

    // -------------------------------------------------------------------------
    // CONFIG
    // -------------------------------------------------------------------------
    
    interface BDTOptions extends bdt.NormalizedConfig {
        
        /**
         * Exit on first error?
         */
        bail?: boolean

        /**
         * Bulk Data API version to test for. Example: `1.0`, `1.2.3`, `2`.
         */
        apiVersion: string

        /**
         * JS case-insensitive RegExp (as string) to run against the test name
         */
        match?: string

    }

    interface AuthenticationOptions {

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
        
        privateKey?: jose.JWK.Key
    
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

    interface ServerConfig {

        /**
         * FHIR server base URL.
         */
        baseURL?: string
    
        /**
         * Authentication options
         */
        authentication?: Partial<AuthenticationOptions>
    
        requests?: {
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
    
    interface NormalizedConfig {
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
            privateKey?: jose.JWK.Key
    
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

    interface TestNodeOptions {
        name: string
        description?: string
        minVersion?: string
        maxVersion?: string
        path?: string
        only?: boolean
        skip?: boolean
    }

    interface Prerequisite {

        /**
         * This will be converted to boolean and if evaluates to false
         * it means that a prerequisite requirement is not met. If
         * function, it will be called with no arguments first, and then
         * the returned value will be converted to boolean
         */
        assertion: any
    
        /**
         * The error message if the assertion fails
         */
        message: string
    }

    type SetupCallbackFn<ContextType=Record<string, any>> = (context: {
        config: bdt.NormalizedConfig
        context: ContextType
    }) => any
    
    type TestCallbackFn<ContextType=Record<string, any>> = (context: {
        config: bdt.NormalizedConfig
        api: TestAPI
        context: ContextType
    }) => any

    export namespace OAuth {
        
        type errorType = (
            /**
             * The request is missing a required parameter, includes an
             * unsupported parameter value (other than grant type),
             * repeats a parameter, includes multiple credentials,
             * utilizes more than one mechanism for authenticating the
             * client, or is otherwise malformed.
             */
            "invalid_request" |
    
            /**
             * Client authentication failed (e.g., unknown client, no
             * client authentication included, or unsupported
             * authentication method).  The authorization server MAY
             * return an HTTP 401 (Unauthorized) status code to indicate
             * which HTTP authentication schemes are supported.  If the
             * client attempted to authenticate via the "Authorization"
             * request header field, the authorization server MUST
             * respond with an HTTP 401 (Unauthorized) status code and
             * include the "WWW-Authenticate" response header field
             * matching the authentication scheme used by the client.
             */
            "invalid_client" |
    
            /**
             * The provided authorization grant (e.g., authorization
             * code, resource owner credentials) or refresh token is
             * invalid, expired, revoked, does not match the redirection
             * URI used in the authorization request, or was issued to
             * another client.
             */
            "invalid_grant" |
    
            /**
             * The authenticated client is not authorized to use this
             * authorization grant type.
             */
            "unauthorized_client" |
            
            /**
             * The authorization grant type is not supported by the
             * authorization server.
             */
            "unsupported_grant_type" |
            
            /**
             * The requested scope is invalid, unknown, malformed, or
             * exceeds the scope granted by the resource owner.
             */
            "invalid_scope"
        )
       
        export interface ErrorResponse {
    
            error: errorType
    
            /**
             * OPTIONAL.  Human-readable ASCII [USASCII] text providing
             * additional information, used to assist the client developer in
             * understanding the error that occurred.
             */
            error_description?: string
    
            /**
             * OPTIONAL.  A URI identifying a human-readable web page with
             * information about the error, used to provide the client
             * developer with additional information about the error.
             * Values for the "error_uri" parameter MUST conform to the
             */
            error_uri?: string
        }
    
        /**
         * Access token response
         */
        export interface TokenResponse {
    
            /**
             * The access token issued by the authorization server.
             */
            access_token: string
    
            /**
             * Fixed value: bearer.
             */
            token_type:	"bearer"
    
            /**
             * The lifetime in seconds of the access token. The recommended value
             * is 300, for a five-minute token lifetime.
             */
            expires_in: number
    
            /**
             * Scope of access authorized. Note that this can be different from the
             * scopes requested by the app.
             */
            scope: string
        }
    }

    export namespace FHIR {
    
        export interface Resource<T = string> extends Record<string, any> {
            resourceType: T
        }
    
        export interface CapabilityStatement extends Resource<"CapabilityStatement"> {}
    
        export interface OperationOutcome extends Resource<"OperationOutcome"> {}
    }
    
    export namespace BulkData {
        /**
         * The response expected upon successful kick-off and status pulling 
         */
        interface ExportManifest {
                
            /**
             * indicates the server's time when the query is run. The response
             * SHOULD NOT include any resources modified after this instant,
             * and SHALL include any matching resources modified up to and
             * including this instant.
             * Note: To properly meet these constraints, a FHIR Server might need
             * to wait for any pending transactions to resolve in its database
             * before starting the export process.
             */
            transactionTime: string // FHIR instant
    
            /**
             * the full URL of the original bulk data kick-off request
             */
            request: string
    
            /**
             * indicates whether downloading the generated files requires a
             * bearer access token.
             * Value SHALL be true if both the file server and the FHIR API server
             * control access using OAuth 2.0 bearer tokens. Value MAY be false for
             * file servers that use access-control schemes other than OAuth 2.0,
             * such as downloads from Amazon S3 bucket URLs or verifiable file
             * servers within an organization's firewall.
             */
            requiresAccessToken: boolean
            
            /**
             * an array of file items with one entry for each generated file.
             * If no resources are returned from the kick-off request, the server
             * SHOULD return an empty array.
             */
            output: ExportManifestFile[]
    
            /**
             * array of error file items following the same structure as the output
             * array.
             * Errors that occurred during the export should only be included here
             * (not in output). If no errors occurred, the server SHOULD return an
             * empty array. Only the OperationOutcome resource type is currently
             * supported, so a server SHALL generate files in the same format as
             * bulk data output files that contain OperationOutcome resources.
             */
            error: ExportManifestFile<"OperationOutcome">[]
    
            /**
             * An array of deleted file items following the same structure as the
             * output array.
             * 
             * When a `_since` timestamp is supplied in the export request, this
             * array SHALL be populated with output files containing FHIR
             * Transaction Bundles that indicate which FHIR resources would have
             * been returned, but have been deleted subsequent to that date. If no
             * resources have been deleted or the _since parameter was not supplied,
             * the server MAY omit this key or MAY return an empty array.
             * 
             * Each line in the output file SHALL contain a FHIR Bundle with a type
             * of transaction which SHALL contain one or more entry items that
             * reflect a deleted resource. In each entry, the request.url and
             * request.method elements SHALL be populated. The request.method
             * element SHALL be set to DELETE.
             * 
             * Example deleted resource bundle (represents one line in output file):
             * @example 
             * ```json
             * {
             *     "resourceType": "Bundle",
             *     "id": "bundle-transaction",
             *     "meta": { "lastUpdated": "2020-04-27T02:56:00Z" },
             *     "type": "transaction",
             *     "entry":[{
             *         "request": { "method": "DELETE", "url": "Patient/123" }
             *         ...
             *     }]
             * }
             * ```
             */
            deleted?: ExportManifestFile<"Bundle">[]
    
            /**
             * To support extensions, this implementation guide reserves the name
             * extension and will never define a field with that name, allowing
             * server implementations to use it to provide custom behavior and
             * information. For example, a server may choose to provide a custom
             * extension that contains a decryption key for encrypted ndjson files.
             * The value of an extension element SHALL be a pre-coordinated JSON
             * object.
             */
            extension?: Record<string, any>
        }
    
        /**
         * Each file or output entry in export manifest
         */
        interface ExportManifestFile<Type = string> {
            
            /**
             * the FHIR resource type that is contained in the file.
             * Each file SHALL contain resources of only one type, but a server MAY
             * create more than one file for each resource type returned. The number
             * of resources contained in a file MAY vary between servers. If no data
             * are found for a resource, the server SHOULD NOT return an output item
             * for that resource in the response. These rules apply only to top-level
             * resources within the response; as always in FHIR, any resource MAY
             * have a "contained" array that includes referenced resources of other
             * types.
             */
            type: Type
    
            /**
             * the path to the file. The format of the file SHOULD reflect that
             * requested in the _outputFormat parameter of the initial kick-off
             * request.
             */
            url: string 
    
            /**
             * the number of resources in the file, represented as a JSON number.
             */
            count?: number
        }
    
        type StatusResponse<T=ExportManifest | FHIR.OperationOutcome | void> = Response<T>
    }

}
// export as namespace bdt
// export { BDT as BDT }

