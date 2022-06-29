/**
 * @type { import("../types").bdt.ServerConfig }
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
        }
    }

};
