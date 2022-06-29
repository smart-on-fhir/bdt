
/**
 * Use this to template define new configurations
 * @type { import("../types").bdt.ServerConfig }
 */
module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://...",

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export"). Living this empty
     * (falsy) or omitting it tells BDT to try to auto-detect it.
     */
    systemExportEndpoint: "",
    
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export"). Living
     * this empty (falsy) or omitting it tells BDT to try to auto-detect it.
     */
    patientExportEndpoint: "",
    
    /**
     * The value should be a path relative to the `baseURL` (typically
     * "Group/{GroupID}/$export"). Leaving this empty (falsy) or omitting it
     * tells BDT to skip group-level export tests.
     */
    groupExportEndpoint: "",

    /**
     * While testing we need to attempt downloading at least one resource type.
     * Please enter the resource type that would be fast to export (because
     * there are not many records of that type). If the server does not support
     * system-level export, please make sure this resource type is accessible
     * through the patient-level or the group-level export endpoint. We use
     * "Patient" by default, just because we presume that it is present on every
     * server.
     */
    fastestResource: "Patient",
    
    /**
     * Authentication options
     */
    authentication: {

        /**
         * REQUIRED. Can be "backend-services", "client-credentials" or "none".
         * - If "none" no authorization will be performed and all the
         *   authorization tests will be skipped.
         * - If "client-credentials" most of the authorization tests will be
         *   skipped.
         * - If "backend-services" (default) all tests will be executed. `jwks`
         *   or `jwks-url` auth must be supported in this case.
         */
        type: "backend-services",

        /**
         * Set this to false if your server does not require authentication.
         * This is only applicable for servers that support authentication but
         * do not require it (in other words auth is optional).
         */
        optional: false,

        /**
         * The full URL of the token endpoint. Required, unless authType is set
         * to "none". If not set (or falsy), BDT will try to auto-detect it but
         * that will only work if the token endpoint has been declared in the
         * CapabilityStatement.
         */
        tokenEndpoint: "https://...",
        
        /**
         * The Client ID is required unless authType is set to "none"
         */
        clientId: "...",
    
        /**
         * Required if authType is set to "client-credentials" and ignored
         * otherwise
         */
        clientSecret: "...",

        /**
         * The Private Key as JWK. Required if authType is set to
         * "backend-services" and ignored otherwise. Can be a JWK object or
         * a PEM string.
         */
        privateKey: {/* JWK */},

        /**
         * BDT is a CLI tool and as such, it is not capable of hosting its
         * public keys on location that will also be accessible by the tested
         * bulk data server. However, you could host those keys yourself. In
         * this case specify the public URL of those keys here. This will
         * enable some additional authentication tests.
         */
        jwksUrl: "",

        /**
         * What scope(s) to request from the server by default. Not used if
         * authentication.type is set to "none". Defaults to "system/*.read".
         */
        scope: "system/*.read",

        /**
         * The specifications states that:
         * > *The authentication JWT SHALL include the following claims, and
         *   SHALL be signed with the client’s private key (which **SHOULD
         *   be an RS384 or ES384 signature**).
         * 
         * We sign with RS384 by default, but allow more!
         * Acceptable values are: RS256, RS384, RS512, ES256, ES384 and ES512
         */
        tokenSignAlgorithm: "ES384", // Change if needed!

        /**
         * Expressed in seconds or a string describing a time span (Eg: `60`,
         * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
         * a seconds count. If you use a string be sure you provide the time
         * units (days, hours, etc), otherwise milliseconds unit is used by
         * default ("120" is equal to "120ms").
         * If not provided, we will use "5m" as default.
         * @see https://github.com/zeit/ms
         */
        tokenExpiresIn: "5m",

        /**
         * Custom values to be merged with the authentication token claims.
         * NOTE that the following cannot be overridden:
         * - `iss` (equals the clientId)
         * - `sub` (equals the clientId)
         * - `aud` (equals the tokenUrl)
         * - `jti` random value generated at runtime
         */
        customTokenClaims: {},

        /**
         * Custom properties to be merged with the authentication token
         * header before signing it.
         * NOTE that the following cannot be overridden:
         * - `typ` (equals "JWT")
         * - `alg` (@see `tokenSignAlgorithm` below)
         * - `kty` (equals the private key `kty`)
         * - `jku` (equals the current `jwks_url` if any)
         */
        customTokenHeaders: {}
    },

    /**
     * Requests customization
     */
    requests: {

        /**
         * If this is set to false, self-signed certificates will be accepted
         */
        strictSSL: true,

        /**
         * Set custom timeout (in milliseconds) for every request if needed
         */
        timeout: 30000,

        /**
         * HTTP headers to be added to every request if needed
         */
        customHeaders: {}
    }

};
