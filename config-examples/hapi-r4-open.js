/**
 * @type { import("../types").bdt.ServerConfig }
 */
module.exports = {
    baseURL: "http://hapi.fhir.org/baseR4",
    patientExportEndpoint: "Patient/$export",
    systemExportEndpoint: "$export",
    groupExportEndpoint: "Group/1941552/$export",
    fastestResource: "Organization",
    requests: {
        timeout: 15000
    },
    authentication: {
        type: "none"
    }
};
