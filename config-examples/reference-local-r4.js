module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "http://localhost:9443/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1Ijo0fQ/fhir",

    // REQUIRED. Can be "backend-services", "client-credentials" or "none".
    // - If "none" no authorization will be performed and all the authorization
    //   tests will be skipped.
    // - If "client-credentials" most of the authorization tests will be skipped.
    // - If "backend-services" (default) all tests will be executed. `jwks` or
    //   `jwks url` auth must be supported in this case.
    authType: "backend-services",

    // REQUIRED: The full URL of the token endpoint
    tokenEndpoint: "http://localhost:9443/auth/token",

    // REQUIRED: The registered Clint ID
    clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoiSTN4STJ5UU5JSlFHWm1vbXFkdW1zcVVaNEhfWW5nUTBydVJPWmNNN0N1b2x5d2lSX0M1MklYbXgtYXdNUlA2OCIsInkiOiIyYnFLbk1lckVONXBqcm90T1lwN1FlQktJdUhMRkQ5Z2MwTXpCM2xISE1pak41VGVGS241eEJpczR3UktHWndsIiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiIyMGRlM2RmYmVhMjU1ZmUzMDkwNWEyZGU5MjgxNmM5MSIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6Inp3dlJzaVNHbnQ1b0oweklCaHBualh5NTd4QTVhQ0ZKYjJIWnZnNDdvM201bWo1SkxqMjdNXy0xUDk2RGRaVlMiLCJ4IjoiSTN4STJ5UU5JSlFHWm1vbXFkdW1zcVVaNEhfWW5nUTBydVJPWmNNN0N1b2x5d2lSX0M1MklYbXgtYXdNUlA2OCIsInkiOiIyYnFLbk1lckVONXBqcm90T1lwN1FlQktJdUhMRkQ5Z2MwTXpCM2xISE1pak41VGVGS241eEJpczR3UktHWndsIiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiMjBkZTNkZmJlYTI1NWZlMzA5MDVhMmRlOTI4MTZjOTEiLCJhbGciOiJFUzM4NCJ9XX0sImFjY2Vzc1Rva2Vuc0V4cGlyZUluIjoxNSwiaWF0IjoxNTk2MjAyNjg5fQ.id-BHL9jXp2a17gQAOScEjqPp2k0Xr5ecQdScoCUYKE",
    
    // Set this to false to allow tests to accept self-signed certificates.
    strictSSL: false,

    // Set this to false if your server does not require authentication
    requiresAuth: false,

    // Enter the ID of the Group used for testing. Keep this empty if the server
    // does not support group-level export.
    groupId: "6",

    // While testing we need to attempt downloading at least one resource type.
    // Please enter the resource type that would be fast to export (because
    // there are not many records of that type). If the server does not support
    // system-level export, please make sure this resource type is accessible
    // through the patient-level or the group-level export endpoint. We use
    // "Patient" by default, just because we presume that it is present on every
    // server.
    fastestResource: "ImagingStudy",

    // The Private Key as JWK
    privateKey   : {
        "kty": "EC",
        "crv": "P-384",
        "d": "zwvRsiSGnt5oJ0zIBhpnjXy57xA5aCFJb2HZvg47o3m5mj5JLj27M_-1P96DdZVS",
        "x": "I3xI2yQNIJQGZmomqdumsqUZ4H_YngQ0ruROZcM7CuolywiR_C52IXmx-awMRP68",
        "y": "2bqKnMerEN5pjrotOYp7QeBKIuHLFD9gc0MzB3lHHMijN5TeFKn5xBis4wRKGZwl",
        "key_ops": [
            "sign"
        ],
        "ext": true,
        "kid": "20de3dfbea255fe30905a2de92816c91",
        "alg": "ES384"
    }
};