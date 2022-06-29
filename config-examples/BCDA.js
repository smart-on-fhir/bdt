/**
 * The BCDA API does not support Backend Services Authentication.
 * Instead, we make basic auth requests to the token endpoint using
 * the ClientID and ClientSecret of the pre-registered client.
 * @type { import("../types").bdt.ServerConfig }
 */
module.exports = {
    baseURL: "https://sandbox.bcda.cms.gov/api/v1",
    fastestResource: "Patient",
    patientExportEndpoint: "Patient/$export",
    groupExportEndpoint: "Group/all/$export",
    authentication: {
        type: "client-credentials",
        tokenEndpoint: "https://sandbox.bcda.cms.gov/auth/token",
        optional: false,
        clientId: "3841c594-a8c0-41e5-98cc-38bb45360d3c",
        clientSecret: "d89810016460e6924a1c62583e5f51d1cbf911366c6bc6f040ff9f620a944efbf2b7264afe071609",
    },
    requests: {
        strictSSL: false
    }
};
