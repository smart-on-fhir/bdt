module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MX0/fhir",

    // REQUIRED: The full URL of the token endpoint
    tokenEndpoint: "https://bulk-data.smarthealthit.org/auth/token",

    // REQUIRED: The registered Clint ID
    clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoiQ1ZRdkdEcXV1T29WRzJlOE1TLVdFdk1ObXIzajZYNjRTRVQtQ20yQkdFTmhsUFMwQU1wWnhTaVZBaDV0ZnJ2diIsInkiOiJxTG1XZVpRZUJ1aUx5amlmXzdsb3BYLWVhN3dzMGpCNVBxdW1HSkRWSzREWFdqNGFESjdDWDFmTVI4cm13c01vIiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiI0NTdlM2IzMzFmYTRkZmU3OTU5MTkyMGFjMTJiY2NjNiIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6ImU4VmNjcE5WNkYtdVpwR1l0X1JVcV9xSjFqRU0xT0t0eDdRaVBVT3hBbEI5VlhuMWlhbGJUVE5HcHpUU01BaFkiLCJ4IjoiQ1ZRdkdEcXV1T29WRzJlOE1TLVdFdk1ObXIzajZYNjRTRVQtQ20yQkdFTmhsUFMwQU1wWnhTaVZBaDV0ZnJ2diIsInkiOiJxTG1XZVpRZUJ1aUx5amlmXzdsb3BYLWVhN3dzMGpCNVBxdW1HSkRWSzREWFdqNGFESjdDWDFmTVI4cm13c01vIiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiNDU3ZTNiMzMxZmE0ZGZlNzk1OTE5MjBhYzEyYmNjYzYiLCJhbGciOiJFUzM4NCJ9XX0sImlzcyI6Imh0dHBzOi8vZ2l0aHViLmNvbS9zbWFydC1vbi1maGlyL3NhbXBsZS1hcHBzLXN0dTMvdHJlZS9tYXN0ZXIvZmhpci1kb3dubG9hZGVyIiwiYWNjZXNzVG9rZW5zRXhwaXJlSW4iOjE1LCJpYXQiOjE1MzYzNDIwOTB9.GjfGpdoT0bkdNpP8zUQNwbu-WIEhIN0NZ1Bnso30S4Q",
    
    // Set this to false to allow tests to accept self-signed certificates.
    strictSSL: false,

    // Set this to false if your server does not require authentication
    requiresAuth: false,

    // Enter the path to the system-level export endpoint relative to the server
    // root (e.g.: "/$export"). Keep this empty if the server does not support
    // system-level export.
    systemExportEndpoint: "/$export",

    // Enter the path to the patient-level export endpoint relative to the
    // server root (e.g.: "/Patient/$export"). Keep this empty if the server
    // does not support patient-level export.
    patientExportEndpoint: "/Patient/$export",

    // Enter the path to the system-level export endpoint relative to the server
    // root (e.g.: "/Group/5/$export"). Please use the id of the group having
    // the least amount of resources. Keep this empty if the server does not
    // support group-level export.
    groupExportEndpoint: "/Group/6/$export",

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
        "d": "e8VccpNV6F-uZpGYt_RUq_qJ1jEM1OKtx7QiPUOxAlB9VXn1ialbTTNGpzTSMAhY",
        "x": "CVQvGDquuOoVG2e8MS-WEvMNmr3j6X64SET-Cm2BGENhlPS0AMpZxSiVAh5tfrvv",
        "y": "qLmWeZQeBuiLyjif_7lopX-ea7ws0jB5PqumGJDVK4DXWj4aDJ7CX1fMR8rmwsMo",
        "key_ops": [
            "sign"
        ],
        "ext": true,
        "kid": "457e3b331fa4dfe79591920ac12bccc6",
        "alg": "ES384"
    }
};