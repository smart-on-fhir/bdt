/// <reference path="../index.d.ts" />

/**
 * @type { BDT.ServerConfig }
 */
module.exports = {
    baseURL: "http://hapi.fhir.org/baseR5",
    patientExportEndpoint: "Patient/$export",
    systemExportEndpoint: "$export",
    groupExportEndpoint: "Group/1126/$export",
    fastestResource: "Immunization",
    requests: {
        timeout: 15000
    }
};
