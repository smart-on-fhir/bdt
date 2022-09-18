/**
 * Use this to template define new configurations
 * @type { import("../types").bdt.ServerConfig }
 */
module.exports = {

    baseURL: "https://fhir.careevolution.com/Master.Adapter1.WebClient/api/fhir-r4",
    systemExportEndpoint: "",
    patientExportEndpoint: "Patient/$export",
    groupExportEndpoint: "Group/32bd1caa-bd36-ed11-8193-0a69c1b3225b/$export",
    fastestResource: "Patient",
    // groupId: "",
    
    authentication: {
        type: "backend-services",
        optional: false,
        clientId: "VladimirEC",
        tokenEndpoint: "https://fhir.careevolution.com/Master.Adapter1.WebClient/identityserver/connect/token",
        // The Private Key as JWK or PEM. Required if authType is set to
        // "backend-services" and ignored otherwise.
        privateKey: {
            "kty": "EC",
            "kid": "6b4d97340621f30f199e36ad6ed9088d",
            "alg": "ES384",
            "key_ops": [
                "sign"
            ],
            "x": "MsUrV48jwrHRJW_O92M8MVaUnIOgVQYropVpZvJTwAQmFVwaEZ5xapQsy42KnSc-",
            "y": "wPquNxRIYfg6keU72YX3ryFwKIFTn52rhUqS3ji185HqLkDS0SIcbvyDckq8LpeK",
            "crv": "P-384",
            "d": "m5IQjqZgjVpIRYdxSQUXHXgiv9NEXtpS43gzTD5lewkjraopaZSKGcFAnNXO8RwF",
            "ext": true
        }
    },




};
