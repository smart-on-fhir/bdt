// The BCDA API does not support Backend Services Authentication.
// Instead, we make basic auth requests to the token endpoint using
// the ClientID and ClientSecret of the pre-registered client.
module.exports = {
    baseURL: "https://sandbox.bcda.cms.gov/api/v1",
    authType: "client-credentials",
    tokenEndpoint: "https://sandbox.bcda.cms.gov/auth/token",
    clientId: "3841c594-a8c0-41e5-98cc-38bb45360d3c",
    clientSecret: "f9780d323588f1cdfc3e63e95a8cbdcdd47602ff48a537b51dc5d7834bf466416a716bd4508e904a",
    requiresAuth: true,
    strictSSL: false,
    groupId: "all",
    fastestResource: "Patient",
    patientExportEndpoint: "Patient/$export",
    groupExportEndpoint: "Group/all/$export",
};
