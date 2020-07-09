// Use this to define new configurations
module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://...",

    // REQUIRED. Can be "backend-services", "client-credentials" or "none".
    // - If "none" no authorization will be performed and all the authorization
    //   tests will be skipped.
    // - If "client-credentials" most of the authorization tests will be skipped.
    // - If "backend-services" (default) all tests will be executed. `jwks` or
    //   `jwksUrl` auth must be supported in this case.
    authType: "backend-services",

    // Set this to false if your server does not require authentication. This
    // is only applicable for servers that support authentication but do not
    // require it (in other words auth is optional).
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

    // Change to "start" to supports the old-style parameter.
    sinceParam: "_since",

    // Enter the path to the system-level export endpoint relative to the server
    // root (e.g.: "/$export"). Keep this empty if the server does not support
    // system-level export.
    systemExportEndpoint: "/$export",

    // Enter the path to the patient-level export endpoint relative to the
    // server root (e.g.: "/Patient/$export"). Keep this empty if the server
    // does not support patient-level export.
    patientExportEndpoint: "/Patient/$export",

    // Enter the path to the system-level export endpoint relative to the server
    // root (e.g.: "/Group/5/$export"). Please use the id of the group having
    // the least amount of resources. Keep this empty if the server does not
    // support group-level export.
    groupExportEndpoint: "",

    // Set this to true if the server supports JWKS URL authorization.
    // NOTE: These tests ate not available in CLI environment.
    jwksUrlAuth: false,

    // The fill URL on which the JWK keys are hosted. This will not be used
    // unless `jwksUrlAuth` is set to `true`. Not available in CLI environment.
    jwksUrl: "https://...",

    // The Private Key as JWK. Required if authType is set to "backend-services"
    // and ignored otherwise
    privateKey: {}
};
