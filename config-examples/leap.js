module.exports = {
    strictSSL: false,
    public: true,
    name: "LEAP Bulk Data Server (deprecated)",
    description: "",
    baseURL: "https://34.73.85.246",
    fastestResource: "Practitioner",
    authType: "backend-services",
    jwksAuth: true,
    jwksUrlAuth: false,
    requiresAuth: true,
    tokenEndpoint: "https://34.73.85.246/auth/token",
    clientId: "leap-client-id",
    clientSecret: "",
    systemExportEndpoint: "$export", // do not auto-detect!
    patientExportEndpoint: "Patient/$export",
    jwks: {
        "keys": [
            {
                "kty": "EC",
                "crv": "P-384",
                "x": "2wthMXYwSD0jbU5itQPGSCXPIE9Q047s5Pa_6ciAQNmac6Sj7vGsurJoxHIxhfho",
                "y": "0AKpeeEQCLfqqVbvZ2-EUPSEcoQB15wM_SGcebRKSCCeeMOqYSrYSBc1ILT4b192",
                "key_ops": [
                    "verify"
                ],
                "ext": true,
                "kid": "9e4cce3ecfd2e3c76540f74264a4a893",
                "alg": "ES384"
            },
            {
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
        ]
    }
};
