/// <reference path="../index.d.ts" />

/**
 * This file will configure BDT to test an R4 instance of the
 * reference bulk data server (https://bulk-data.smarthealthit.org)
 * @type { BDT.ServerConfig }
 */
module.exports = {
    baseURL: "https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1Ijo0LCJkZWwiOjB9/fhir",
    
    strictSSL: false,
    groupId: "ff7dc35f-79e9-47a0-af22-475cf301a085",
    fastestResource: "ImagingStudy",
    
    authType: "backend-services",
    tokenEndpoint: "https://bulk-data.smarthealthit.org/auth/token",
    requiresAuth: false,
    
    // FOR JWKS Auth
    // clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoiM0sxTHc3UWtqajVMV1NrNU5uSXdXbWtiNVlvMkdrY3dWdG5NOHhoaEdkTTBiSTNCNjMyUU1abXF0UkhRNUFQSiIsInkiOiJDQnFpcTVRd0U4RXlVeHcyX29ESnpWSHJZNWoyMm55OUtiUkNLNXZBQnBwYUdPNHg4TXhuVFdmUU10R0liVlFOIiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiJiMzdmY2YwYjU4MDFmZGUzYWY0OGJkNTVmZDk1MTE3ZSIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6InRiN3BjUlRoYlo4Z0hNRkxaWEpMTUc0OFUwZXV1aVBxU0hCc09ZUFIyQnFzZHE5ckVxNFBpNkxpT284OTBRbTgiLCJ4IjoiM0sxTHc3UWtqajVMV1NrNU5uSXdXbWtiNVlvMkdrY3dWdG5NOHhoaEdkTTBiSTNCNjMyUU1abXF0UkhRNUFQSiIsInkiOiJDQnFpcTVRd0U4RXlVeHcyX29ESnpWSHJZNWoyMm55OUtiUkNLNXZBQnBwYUdPNHg4TXhuVFdmUU10R0liVlFOIiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiYjM3ZmNmMGI1ODAxZmRlM2FmNDhiZDU1ZmQ5NTExN2UiLCJhbGciOiJFUzM4NCJ9XX0sImFjY2Vzc1Rva2Vuc0V4cGlyZUluIjoxNSwiaWF0IjoxNjIxNTM4OTAwfQ._49HUxLmA0EAUIspaYgiSCm0igM_zAmMOeQLJV2sH48",
    
    // For JWKS URL Auth
    clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzX3VybCI6Imh0dHBzOi8vYnVsay1kYXRhLnNtYXJ0aGVhbHRoaXQub3JnL2tleXMvRVMzODQucHVibGljLmpzb24iLCJhY2Nlc3NUb2tlbnNFeHBpcmVJbiI6MTUsImlhdCI6MTYyMTU0MDgzOX0.xvJ5mQFciD8KJMje3oggdkCUNIeCezDpBAqUzmnTGGY",
    jwksUrl: "https://bulk-data.smarthealthit.org/keys/ES384.public.json",

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

};