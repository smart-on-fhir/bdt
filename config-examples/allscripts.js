
/**
 * Use this to template define new configurations
 * @type { import("../types").bdt.ServerConfig }
 */
module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://allscriptsfhirconnect.open.allscripts.com/R4/fhir-InfernoStageStandalone/",

    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export"). Living this empty
     * (falsy) or omitting it tells BDT to try to auto-detect it.
     */
    systemExportEndpoint: "",
    
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export"). Living
     * this empty (falsy) or omitting it tells BDT to try to auto-detect it.
     */
    patientExportEndpoint: "",
    
    /**
     * The value should be a path relative to the `baseURL` (typically
     * "Group/{GroupID}/$export"). Leaving this empty (falsy) or omitting it
     * tells BDT to skip group-level export tests.
     */
    groupExportEndpoint: "Group/77/$export",

    /**
     * While testing we need to attempt downloading at least one resource type.
     * Please enter the resource type that would be fast to export (because
     * there are not many records of that type). If the server does not support
     * system-level export, please make sure this resource type is accessible
     * through the patient-level or the group-level export endpoint. We use
     * "Patient" by default, just because we presume that it is present on every
     * server.
     */
    fastestResource: "Organization",

    supportedResourceTypes: [
        "AllergyIntolerance",
        "CarePlan",
        "CareTeam",
        "Condition",
        "Binary",
        "Device",
        "DiagnosticReport",
        "DocumentReference",
        "Encounter",
        "Goal",
        "Group",
        "Immunization",
        "Location",
        "Medication",
        "MedicationRequest",
        "Observation",
        "Organization",
        "Patient",
        "Practitioner",
        "PractitionerRole",
        "Procedure",
        "Provenance",
        "RelatedPerson"
    ],
    
    /**
     * Authentication options
     */
    authentication: {

        /**
         * REQUIRED. Can be "backend-services", "client-credentials" or "none".
         * - If "none" no authorization will be performed and all the
         *   authorization tests will be skipped.
         * - If "client-credentials" most of the authorization tests will be
         *   skipped.
         * - If "backend-services" (default) all tests will be executed. `jwks`
         *   or `jwks-url` auth must be supported in this case.
         */
        type: "backend-services",

        /**
         * Set this to false if your server does not require authentication.
         * This is only applicable for servers that support authentication but
         * do not require it (in other words auth is optional).
         */
        optional: false,

        /**
         * The full URL of the token endpoint. Required, unless authType is set
         * to "none". If not set (or falsy), BDT will try to auto-detect it but
         * that will only work if the token endpoint has been declared in the
         * CapabilityStatement.
         */
        tokenEndpoint: "https://allscriptsfhirconnect.open.allscripts.com/authorizationV2-InfernoStageStandalone/connect/token",
        
        /**
         * The Client ID is required unless authType is set to "none"
         */
        clientId: "5F97CE48-D7A9-4C3D-9368-455836490B15",
    
        /**
         * Required if authType is set to "client-credentials" and ignored
         * otherwise
         */
        // clientSecret: "...",

        /**
         * The Private Key as JWK. Required if authType is set to
         * "backend-services" and ignored otherwise. Can be a JWK object or
         * a PEM string.
         */
        privateKey: {
            "kty": "RSA",
            "kid": "6cf70879258f9c656bb7ccc65802d099",
            "alg": "RS384",
            "key_ops": [
                "sign"
            ],
            "n": "wYrXh4-wDtTS7tPVxNdl0mAyCd_IEUECR1Ew91b7BQYwow2at4L8PEQ1bRaGSxWATuviaD0Y9UhLzJ2DPMRDUzbao1evCkrKs-yY1ox1xPeNl8cE9RMTZIcGcAS4r8O_DlM4z-yNhUENi5vsY1qPPfde28FObAH3wr7e63viU-LUpJxJmTb5dSGWIearyDg9H8wZpQAR9k2GrZxqqS17mzEiEqtxUpiw26ABShqJQ4xgOAQoiE7WV3yvf36AqpcO2WtwwS6xwcLw55oZzou3MT2aGZPmNZkdyisGOU9A01REwrwxw6TVbabrb2kIINfDE-Wyes2ZocTJb_zNUZN5xw",
            "e": "AQAB",
            "d": "Bq-dMnmsQ1bm0olO4TXvtozMLbslVjNAuOX9Iw5GLa5BD-Dwb1Z_EDXrApG8oetkO1W6xI8XxaFxvOfUGM1O5hkHBI2K5nge-Ig7322Kw_spUQz3BuBZ0yc2-bewCaJhf0UwuT4axXex2BjS2bvPJvzcsgrDgseun3Ooj8n_z5X_DreQBSrKNpns6MG-9FQhkTDLt-aaYkrL0njXN3LnxhuvMjrCUEy8jCLaDHpPdiThTxGlIu4z5mw_RraMIU3uesXDJQHuaKN6j7Lqwy0qlnmEy5WchTikAyfAwLWSMAS7GL16SX9Wxqk3WCNbSMlOTy0NdBvdjKIH5akYJjUfQQ",
            "p": "5xfttF1T_iP8TanFDewG7Xln9dz415nj89W6zDx3FxDMzbgQscQTDPdlYuMQaoZKgZ6RmDTNP0YxMilfhIs17sJ7ORaKF6ssraS_CEuBnS65zwzAB6iT5mguX8ZnPF_Qbob2pTKXRxUkXHEYJfVZnbRFvQ9APBabtEg9ABqTaL0",
            "q": "1mbYVkg7s7Jfr0omLBlbKQ4m-hdetxf7bSjEexzeSGIy4bTXvzX6sHUIKrC5KnKW9pOvmcJkxnzsxHbuuEt4q1FB3cxxjvFJAqz6c2xuw6lmefbYYWWKDVecUkT2Kc_n5P4xwg2z-GjLJs_gU64jyfSArdNua_XzMwqwq9LmHtM",
            "dp": "ifXyFexlmWI4XNEOcCpJVHpXQyOBd41K1iXxl749RorkCahqZwXsbaBAadGu2jmDv3A_8UMMiUrJUe37NTC6qOh4EfPPyyOIz717wmL5ZTIhAWfWOHw-l534mXrj5No6n9F469SRFYGcrIdj6D1aG9kkjSLOsVC58d3ydN5oxG0",
            "dq": "0vXNJlDa1bzMo6jdGIU2ipYPSgNWweeKEGWNtum32hcto6KSquVNLvVovMC44Yhw_Fxi63M4P4nKWqH_0D0Kld9VZQ12K0VFJqnXoVzvO_ziBV4amPMVPH2ZJeYPJSMaNNrdUOi0zdcnFaBzRUNSmbPILcGdpAMUcoOxRNA2d9s",
            "qi": "L-GcGJ5s6XGofwfFE0HRdGg6UEwDuHUJo6hwksG9nc-AqLcNIvJ15Q90dfaqRN1UUza2zYiy7W1I3Vq4Z6OHguXQmdDHTCqCrGJLprvm9x473y2I55MVJ2JsjwPJePVNrJB_KF0zDYY6uYSSL8nTxLmXLBhxvLpKjBb3lkLDpBg",
            "ext": true
        },

        /**
         * BDT is a CLI tool and as such, it is not capable of hosting its
         * public keys on location that will also be accessible by the tested
         * bulk data server. However, you could host those keys yourself. In
         * this case specify the public URL of those keys here. This will
         * enable some additional authentication tests.
         */
        jwksUrl: "https://bulk-data.smarthealthit.org/keys/RS384.public.json",

        /**
         * What scope(s) to request from the server by default. Not used if
         * authentication.type is set to "none". Defaults to "system/*.read".
         */
        scope: "system/*.read",

        /**
         * The specifications states that:
         * > *The authentication JWT SHALL include the following claims, and
         *   SHALL be signed with the client’s private key (which **SHOULD
         *   be an RS384 or ES384 signature**).
         * 
         * We sign with RS384 by default, but allow more!
         * Acceptable values are: RS256, RS384, RS512, ES256, ES384 and ES512
         */
        tokenSignAlgorithm: "ES384", // Change if needed!

        /**
         * Expressed in seconds or a string describing a time span (Eg: `60`,
         * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
         * a seconds count. If you use a string be sure you provide the time
         * units (days, hours, etc), otherwise milliseconds unit is used by
         * default ("120" is equal to "120ms").
         * If not provided, we will use "5m" as default.
         * @see https://github.com/zeit/ms
         */
        tokenExpiresIn: "5m",

        /**
         * Custom values to be merged with the authentication token claims.
         * NOTE that the following cannot be overridden:
         * - `iss` (equals the clientId)
         * - `sub` (equals the clientId)
         * - `aud` (equals the tokenUrl)
         * - `jti` random value generated at runtime
         */
        customTokenClaims: {},

        /**
         * Custom properties to be merged with the authentication token
         * header before signing it.
         * NOTE that the following cannot be overridden:
         * - `typ` (equals "JWT")
         * - `alg` (@see `tokenSignAlgorithm` below)
         * - `kty` (equals the private key `kty`)
         * - `jku` (equals the current `jwks_url` if any)
         */
        customTokenHeaders: {}
    },

    /**
     * Requests customization
     */
    requests: {

        /**
         * If this is set to false, self-signed certificates will be accepted
         */
        strictSSL: true,

        /**
         * Set custom timeout (in milliseconds) for every request if needed
         */
        timeout: 30000,

        /**
         * HTTP headers to be added to every request if needed
         */
        customHeaders: {}
    }

};
