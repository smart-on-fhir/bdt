/**
 * @type { import("../src/lib/Config").ServerConfig }
 */
module.exports = {
    baseURL: "http://hapi.fhir.org/baseR5",
    patientExportEndpoint: "Patient/$export",
    systemExportEndpoint: "$export",
    groupExportEndpoint: "Group/1126/$export",
    fastestResource: "Immunization",
    requests: {
        timeout: 15000
    },
    authentication: {
        type: "none"
    }
};
