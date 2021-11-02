module.exports = {
    /**
     * FHIR server base URL.
     */
    baseURL: "",

    authentication: {
        /**
         * Can be:
         * - `backend-services` (*default*) all tests will be executed.
         * - `client-credentials` - uses client_id and client_secret. Most of the
         *    authorization tests will be skipped.
         * - `none` - no authorization will be performed and all the authorization 
         *    tests will be skipped.
         */
        type: "none",

        /**
         * Set to true if auth if supported but not required
         */
        optional: false,

        /**
         * Required if authType is other than "none"
         */
        clientId: "",

        /**
         * Required if authType is set to "client-credentials"
         */
        clientSecret: "",

        /**
         * Not used if authType is set to "none"
         * Defaults to "system/*.read"
         */
        scope: "system/*.read",

        /**
         * The full URL of the token endpoint. Required, unless authType is set
         * to "none"
         */
        tokenEndpoint: "",

        privateKey: { /* your private JWK */ },

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
        customTokenHeaders: {},

        /**
         * The specifications states that:
         * > *The authentication JWT SHALL include the following claims, and
         *   SHALL be signed with the client’s private key (which **SHOULD
         *   be an RS384 or ES384 signature**).*
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
         * 
         */
        jwksUrl: ""
    },

    /**
     * Custom options for every request, EXCLUDING the authorization request.
     * Many options are available so be careful what you specify here! Some
     * useful options are hinted below.
     * @see https://github.com/sindresorhus/got/blob/main/documentation/2-options.md
     * @type {import("got/dist/source").OptionsOfUnknownResponseBody}
     */
    requests: {
        strictSSL: true,
        timeout: 30000,
        customHeaders: {},
    },

    groupId: "",

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * To speed up initialization (or if the server does not have a
     * CapabilityStatement or if it is not properly declaring its system
     * export capabilities), you can skip that check by declaring the
     * `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export").
     * If the server does not support system-level export set this to
     * empty string.
     */
    systemExportEndpoint: "$export", // will be auto-detected if not defined

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * To speed up initialization (or if the server does not have a
     * CapabilityStatement or if it is not properly declaring its patient
     * export capabilities), you can skip that check by declaring the
     * `patientExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "Patient/$export").
     * If the server does not support patient-level export set this to
     * empty string.
     */
    patientExportEndpoint: "Patient/$export", // will be auto-detected if not defined

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports group-level export. If so, and if `groupId`
     * is set group-level tests will be enabled.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the group export support, you can skip that
     * check by declaring the `groupExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Group/{GroupID}/$export").
     * Note that if you set this, then the `groupId` option will not be used
     * since the `groupId` is already part of the `groupExportEndpoint` path.
     */
    groupExportEndpoint: "", // will be auto-detected if not defined

    fastestResource: "Patient",

    supportedResourceTypes: ["Patient"]
};
