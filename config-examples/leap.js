
/**
 * @type { import("../src/lib/Config").ServerConfig }
 */
module.exports = {
    baseURL: "https://34.73.85.246",
    fastestResource: "Practitioner",
    systemExportEndpoint: "$export",
    patientExportEndpoint: "Patient/$export",

    requests: {
        strictSSL: false,
        timeout: 20000
    },

    authentication: {
        type: "backend-services",
        tokenEndpoint: "https://34.73.85.246/auth/token",
        clientId: "leap-client-id",
        optional: false,
        privateKey: {
            "kty": "EC",
            "crv": "P-384",
            "d": "4Nfxv5pDI65G9OJo0_khPX9OW-gY1sEXV-SpSmbes0iE4HxTr1KfP2r_pxnrlZBS",
            "x": "2wthMXYwSD0jbU5itQPGSCXPIE9Q047s5Pa_6ciAQNmac6Sj7vGsurJoxHIxhfho",
            "y": "0AKpeeEQCLfqqVbvZ2-EUPSEcoQB15wM_SGcebRKSCCeeMOqYSrYSBc1ILT4b192",
            "key_ops": [
                "sign"
            ],
            "ext": true,
            "kid": "9e4cce3ecfd2e3c76540f74264a4a893",
            "alg": "ES384"
        }
    },
};
