// Use this to template define new configurations
module.exports = {
    baseURL              : "https://fhir-ehr.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    tokenEndpoint        : "https://fhir-ehr.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d/token",
    clientId             : "sample_jwks_es384",
    requiresAuth         : true,
    strictSSL            : true,
    fastestResource      : "Patient",
    public               : false,
    groupId              : null,
    authType             : "backend-services",
    scope                : "system/*.read",
    patientExportEndpoint: "Patient/$export",
    jwks: {
        "keys": [
            {
                "kty": "EC",
                "crv": "P-384",
                "x": "pyqburM9y8HPcFhNosDW6ngoVEJitqXi_HJgI5hYqX21PoFDwCbYirGy_o0oapIU",
                "y": "95bxkCnMKoHvgbcPAIAcgzzu8scd81mXfM_IzuJFNfkUNkGYBFGvuEU1KPi5j1ob",
                "key_ops": [
                    "verify"
                ],
                "ext": true,
                "kid": "cd520211e5661dbba2256f67f6d53f97",
                "alg": "ES384"
            },
            {
                "kty": "EC",
                "crv": "P-384",
                "d": "hQCNmfvZEUjOon8zLc0bULlmrDPFHrieFHRVZUGMuiQscx9IO7MT03TsaCPdPv0u",
                "x": "pyqburM9y8HPcFhNosDW6ngoVEJitqXi_HJgI5hYqX21PoFDwCbYirGy_o0oapIU",
                "y": "95bxkCnMKoHvgbcPAIAcgzzu8scd81mXfM_IzuJFNfkUNkGYBFGvuEU1KPi5j1ob",
                "key_ops": [
                    "sign"
                ],
                "ext": true,
                "kid": "cd520211e5661dbba2256f67f6d53f97",
                "alg": "ES384"
            }
        ]
    }
};
