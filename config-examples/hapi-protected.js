/// <reference path="../index.d.ts" />

/**
 * @type { BDT.ServerConfig }
 */
module.exports = {
    baseURL: "https://bulk-data-auth-proxy.herokuapp.com/fhir/",
    patientExportEndpoint: "Patient/$export",
    systemExportEndpoint: "$export",
    // groupExportEndpoint: "Group/1126/$export",
    fastestResource: "Immunization",
    requests: {
        timeout: 15000
    },

    authentication: {
        type         : "backend-services",
        tokenEndpoint: "https://bulk-data-auth-proxy.herokuapp.com/auth/token",
        optional     : true,
        clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd2tzIjp7ImtleXMiOlt7" +
            "Imt0eSI6IkVDIiwia2lkIjoiR3YxUUEzaktFQVNIRi1DV1hIMXZudHpPc0M2blJQbl9" +
            "LZmJIdlZ2SUFyRSIsImFsZyI6IkVTMzg0IiwiY3J2IjoiUC0zODQiLCJ4IjoiUUlHaW" +
            "diUU41MkQxdHpjWUFFNkVfeTBtVFZrZldOaFNZZ2pwaGFaLTk0UVI3TnZaMzJlWG1nS" +
            "kZJWkVTREZBTCIsInkiOiJ6YWlWRnRqQ1VBSlkzRFg4NU96SmROVUs1Z3NleHVjZERo" +
            "MW5seS1UbmltcWlzRjZTX0ZPU0FIenV1RnFUbjNzIn1dfSwiandrc191cmkiOiIiLCJ" +
            "zY29wZSI6InN5c3RlbS8qLnJlYWQiLCJjcmVhdGVkX2F0IjoxNjMwOTQzOTQ2NzAzLC" +
            "JpYXQiOjE2MzA5NDM5NDZ9.QhWpA5-6T4AU4axf3MXKrcuo4XhPLwaobHkGT-Lj8h8",
        privateKey: {
            "kty": "EC",
            "kid": "Gv1QA3jKEASHF-CWXH1vntzOsC6nRPn_KfbHvVvIArE",
            "alg": "ES384",
            "crv": "P-384",
            "x": "QIGigbQN52D1tzcYAE6E_y0mTVkfWNhSYgjphaZ-94QR7NvZ32eXmgJFIZESDFAL",
            "y": "zaiVFtjCUAJY3DX85OzJdNUK5gsexucdDh1nly-TnimqisF6S_FOSAHzuuFqTn3s",
            "d": "rqql9ojQ93G9TacwvrYGVlM5HTPEY6HEUUcYt_m9ZrsGmdxGQW4X0t2-gH9qJLnI",
        },
    }



    // baseURL: "https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1Ijo0LCJkZWwiOjB9/fhir",
    // groupId: "ff7dc35f-79e9-47a0-af22-475cf301a085",
    // fastestResource: "ImagingStudy",
    // authentication: {
    //     type: "backend-services",
    //     tokenEndpoint: "https://bulk-data.smarthealthit.org/auth/token",
    //     optional: true,
    //     clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzX3VybCI6Imh0dHBzOi8vYnVsay1kYXRhLnNtYXJ0aGVhbHRoaXQub3JnL2tleXMvRVMzODQucHVibGljLmpzb24iLCJhY2Nlc3NUb2tlbnNFeHBpcmVJbiI6MTUsImlhdCI6MTYyMTU0MDgzOX0.xvJ5mQFciD8KJMje3oggdkCUNIeCezDpBAqUzmnTGGY",
    //     privateKey: {
    //         "kty": "EC",
    //         "crv": "P-384",
    //         "d": "tb7pcRThbZ8gHMFLZXJLMG48U0euuiPqSHBsOYPR2Bqsdq9rEq4Pi6LiOo890Qm8",
    //         "x": "3K1Lw7Qkjj5LWSk5NnIwWmkb5Yo2GkcwVtnM8xhhGdM0bI3B632QMZmqtRHQ5APJ",
    //         "y": "CBqiq5QwE8EyUxw2_oDJzVHrY5j22ny9KbRCK5vABppaGO4x8MxnTWfQMtGIbVQN",
    //         "key_ops": [
    //             "sign"
    //         ],
    //         "ext": true,
    //         "kid": "b37fcf0b5801fde3af48bd55fd95117e",
    //         "alg": "ES384"
    //     },
    //     jwksUrl: "https://bulk-data.smarthealthit.org/keys/ES384.public.json",
    // },
    // requests: {
    //     strictSSL: false
    // },
};
