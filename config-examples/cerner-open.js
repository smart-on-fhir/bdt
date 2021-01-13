// Use this to template define new configurations
module.exports = {
    baseURL: "https://fhir-open.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    authType: "none",
    patientExportEndpoint: "Patient/$export",
    requiresAuth: false,
    strictSSL: true,
    fastestResource: "Patient"
};
