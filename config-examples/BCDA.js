// The BCDA API does not support Backend Services Authentication.
// Instead, we make basic auth requests to the token endpoint using
// the ClientID and ClientSecret of the pre-registered client.
module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://sandbox.bcda.cms.gov/api/v1",

    // REQUIRED: The full URL of the token endpoint
    tokenEndpoint: "https://sandbox.bcda.cms.gov/auth/token",

    // REQUIRED: The registered Clint ID
    clientId: "3841c594-a8c0-41e5-98cc-38bb45360d3c",

    // ONLY set this if your server uses client-credentials auth flow
    clientSecret: "f9780d323588f1cdfc3e63e95a8cbdcdd47602ff48a537b51dc5d7834bf466416a716bd4508e904a",

    // Set this to false if your server does not require authentication
    requiresAuth: true,
    
    // Set this to false to allow tests to accept self-signed certificates.
    strictSSL: false,

    // The BCDA API does not currently support system-level export
    systemExportEndpoint: "",

    // Enter the path to the patient-level export endpoint relative to the
    // server root (e.g.: "/Patient/$export"). Keep this empty if the server
    // does not support patient-level export.
    patientExportEndpoint: "/Patient/$export",

    // The BCDA API does support group-level export but we don't know what
    // group IDs are available
    groupExportEndpoint: "/Group/all/$export",

    // While testing we need to attempt downloading at least one resource type.
    // Please enter the resource type that would be fast to export (because
    // there are not many records of that type). If the server does not support
    // system-level export, please make sure this resource type is accessible
    // through the patient-level or the group-level export endpoint. We use
    // "Patient" by default, just because we presume that it is present on every
    // server.
    fastestResource: "Patient"
};
