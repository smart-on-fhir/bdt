/// <reference path="../index.d.ts" />

/**
 * Use this to template define new configurations
 * @type { BDT.ServerConfig }
 */
module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://...",

    // REQUIRED. Can be "backend-services", "client-credentials" or "none".
    // - If "none" no authorization will be performed and all the authorization
    //   tests will be skipped.
    // - If "client-credentials" most of the authorization tests will be skipped.
    // - If "backend-services" (default) all tests will be executed. `jwks` or
    //   `jwks-url` auth must be supported in this case.
    authType: "backend-services",

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export").
     * @type {string}
     */
    systemExportEndpoint: "", // will be auto-detected if not defined

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export").
     * @type {string}
     */
    patientExportEndpoint: "", // will be auto-detected if not defined

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
     * @type {string}
     */
    groupExportEndpoint: "", // will be auto-detected if not defined

    /**
     * Set this to false if your server does not require authentication. This
     * is only applicable for servers that support authentication but do not
     * require it (in other words auth is optional).
     * @type {boolean}
     */
    requiresAuth: true,

    // Set this to false to allow tests to accept self-signed certificates.
    strictSSL: true,

    // The full URL of the token endpoint. Required, unless authType is set to "none"
    tokenEndpoint: "https://...",

    // The Client ID is required unless authType is set to "none"
    clientId: "...",

    // Required if authType is set to "client-credentials" and ignored otherwise
    clientSecret: "...",

    // While testing we need to attempt downloading at least one resource type.
    // Please enter the resource type that would be fast to export (because
    // there are not many records of that type). If the server does not support
    // system-level export, please make sure this resource type is accessible
    // through the patient-level or the group-level export endpoint. We use
    // "Patient" by default, just because we presume that it is present on every
    // server.
    fastestResource: "Patient",

    // Enter the ID of the Group used for testing. Keep this empty if the server
    // does not support group-level export.
    groupId: "",

    // Set this to true if the server supports JWKS URL authorization.
    // NOTE: These tests ate not available in CLI environment.
    jwksUrlAuth: false,

    // ------------------------------------------------------------------------
    // KEYS
    // ------------------------------------------------------------------------
    // We typically only need a private key. Public keys are only used in
    // JWKS-URL authentication tests which are not available in CLI because the
    // tester is not online and cannot publicly host keys.
    // The keys can be specified explicitly as "privateKey" and "publicKey"
    // settings, or in a "jwks" object.
    // ------------------------------------------------------------------------

    // The Private Key as JWK. Required if authType is set to "backend-services"
    // and ignored otherwise. NOTE that if "jwks" is used and a public/private
    // key pair is found in it, that will take precedence and this "privateKey"
    // option will be ignored.
    privateKey: {},

    // The Public Key as JWK. Required if authType is set to "backend-services"
    // and "jwksUrlAuth" is set true (and if tests are not running in CLI),
    // and ignored otherwise. NOTE that if "jwks" is used and a public/private
    // key pair is found in it, that will take precedence and this "publicKey"
    // option will be ignored.
    publicKey: {},

    // If set, this should be an object having a "keys" array of JSON Web Keys
    // containing a valid public/private key pair. NOTE that if "jwks" is used
    // and a public/private key pair is found in it, those keys will be used
    // and the "publicKey" and privateKey options (if set) will be ignored.
    jwks: { keys: [] }
};
