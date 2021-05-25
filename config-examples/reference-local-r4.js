/// <reference path="../index.d.ts" />

/**
 * This file will configure BDT to test a a locally running instance of the
 * reference bulk data server (https://github.com/smart-on-fhir/bulk-data-server)
 * @type { import("../src/lib/Config").ServerConfig }
 */
module.exports = {
    baseURL: "http://localhost:9443/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1Ijo0fQ/fhir",
    strictSSL: false,
    groupId: "ff7dc35f-79e9-47a0-af22-475cf301a085",
    fastestResource: "ImagingStudy",
    authentication: {
        type: "backend-services",
        optional: true,
        clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzX3VybCI6Imh0dHBzOi8vYnVsay1kYXRhLnNtYXJ0aGVhbHRoaXQub3JnL2tleXMvRVMzODQucHVibGljLmpzb24iLCJhY2Nlc3NUb2tlbnNFeHBpcmVJbiI6MTUsImlhdCI6MTYyMTU0MDgzOX0.xvJ5mQFciD8KJMje3oggdkCUNIeCezDpBAqUzmnTGGY",
        privateKey: {
            "kty": "EC",
            "crv": "P-384",
            "d": "tb7pcRThbZ8gHMFLZXJLMG48U0euuiPqSHBsOYPR2Bqsdq9rEq4Pi6LiOo890Qm8",
            "x": "3K1Lw7Qkjj5LWSk5NnIwWmkb5Yo2GkcwVtnM8xhhGdM0bI3B632QMZmqtRHQ5APJ",
            "y": "CBqiq5QwE8EyUxw2_oDJzVHrY5j22ny9KbRCK5vABppaGO4x8MxnTWfQMtGIbVQN",
            "key_ops": [
                "sign"
            ],
            "ext": true,
            "kid": "b37fcf0b5801fde3af48bd55fd95117e",
            "alg": "ES384"
        },
        jwksUrl: "https://bulk-data.smarthealthit.org/keys/ES384.public.json",
    }
};