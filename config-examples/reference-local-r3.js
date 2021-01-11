// This file will configure BDT to test a locally running instance of the
// reference bulk data server (https://github.com/smart-on-fhir/bulk-data-server)
module.exports = {
    baseURL: "http://localhost:9443/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1IjozfQ/fhir",
    authType: "backend-services",
    tokenEndpoint: "http://localhost:9443/auth/token",
    clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoiSTN4STJ5UU5JSlFHWm1vbXFkdW1zcVVaNEhfWW5nUTBydVJPWmNNN0N1b2x5d2lSX0M1MklYbXgtYXdNUlA2OCIsInkiOiIyYnFLbk1lckVONXBqcm90T1lwN1FlQktJdUhMRkQ5Z2MwTXpCM2xISE1pak41VGVGS241eEJpczR3UktHWndsIiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiIyMGRlM2RmYmVhMjU1ZmUzMDkwNWEyZGU5MjgxNmM5MSIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6Inp3dlJzaVNHbnQ1b0oweklCaHBualh5NTd4QTVhQ0ZKYjJIWnZnNDdvM201bWo1SkxqMjdNXy0xUDk2RGRaVlMiLCJ4IjoiSTN4STJ5UU5JSlFHWm1vbXFkdW1zcVVaNEhfWW5nUTBydVJPWmNNN0N1b2x5d2lSX0M1MklYbXgtYXdNUlA2OCIsInkiOiIyYnFLbk1lckVONXBqcm90T1lwN1FlQktJdUhMRkQ5Z2MwTXpCM2xISE1pak41VGVGS241eEJpczR3UktHWndsIiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiMjBkZTNkZmJlYTI1NWZlMzA5MDVhMmRlOTI4MTZjOTEiLCJhbGciOiJFUzM4NCJ9XX0sImFjY2Vzc1Rva2Vuc0V4cGlyZUluIjoxNSwiaWF0IjoxNTk2MjAyNjg5fQ.id-BHL9jXp2a17gQAOScEjqPp2k0Xr5ecQdScoCUYKE",
    strictSSL: false,
    requiresAuth: false,
    groupId: "ad44e371-4d6d-486d-aebe-3fd29fffdf58",
    fastestResource: "ImagingStudy",
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