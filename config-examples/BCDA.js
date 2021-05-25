// The BCDA API does not support Backend Services Authentication.
// Instead, we make basic auth requests to the token endpoint using
// the ClientID and ClientSecret of the pre-registered client.
module.exports = {
    baseURL: "https://sandbox.bcda.cms.gov/api/v1",
    authType: "client-credentials",
    tokenEndpoint: "https://sandbox.bcda.cms.gov/auth/token",
    clientId: "0c527d2e-2e8a-4808-b11d-0fa06baf8254",
    clientSecret: "36e0ea2217e6d6180f3ab1108d02ca100d684ebdccc04817ce842300996e568c3d77fc61d84006a3",
    requiresAuth: true,
    strictSSL: false,
    groupId: "all",
    fastestResource: "Patient",
    patientExportEndpoint: "Patient/$export",
    groupExportEndpoint: "Group/all/$export",
};
