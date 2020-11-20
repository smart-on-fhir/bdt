// See config-examples/template.js for full list of options and
// their descriptions.
module.exports = {
    authType             : "backend-services", // backend-services|client-credentials|none
    baseURL              : "https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MX0/fhir",
    tokenEndpoint        : "https://bulk-data.smarthealthit.org/auth/token",
    clientId             : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoiQ1ZRdkdEcXV1T29WRzJlOE1TLVdFdk1ObXIzajZYNjRTRVQtQ20yQkdFTmhsUFMwQU1wWnhTaVZBaDV0ZnJ2diIsInkiOiJxTG1XZVpRZUJ1aUx5amlmXzdsb3BYLWVhN3dzMGpCNVBxdW1HSkRWSzREWFdqNGFESjdDWDFmTVI4cm13c01vIiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiI0NTdlM2IzMzFmYTRkZmU3OTU5MTkyMGFjMTJiY2NjNiIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6ImU4VmNjcE5WNkYtdVpwR1l0X1JVcV9xSjFqRU0xT0t0eDdRaVBVT3hBbEI5VlhuMWlhbGJUVE5HcHpUU01BaFkiLCJ4IjoiQ1ZRdkdEcXV1T29WRzJlOE1TLVdFdk1ObXIzajZYNjRTRVQtQ20yQkdFTmhsUFMwQU1wWnhTaVZBaDV0ZnJ2diIsInkiOiJxTG1XZVpRZUJ1aUx5amlmXzdsb3BYLWVhN3dzMGpCNVBxdW1HSkRWSzREWFdqNGFESjdDWDFmTVI4cm13c01vIiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiNDU3ZTNiMzMxZmE0ZGZlNzk1OTE5MjBhYzEyYmNjYzYiLCJhbGciOiJFUzM4NCJ9XX0sImlzcyI6Imh0dHBzOi8vZ2l0aHViLmNvbS9zbWFydC1vbi1maGlyL3NhbXBsZS1hcHBzLXN0dTMvdHJlZS9tYXN0ZXIvZmhpci1kb3dubG9hZGVyIiwiYWNjZXNzVG9rZW5zRXhwaXJlSW4iOjE1LCJpYXQiOjE1MzYzNDIwOTB9.GjfGpdoT0bkdNpP8zUQNwbu-WIEhIN0NZ1Bnso30S4Q",
    strictSSL            : false,
    requiresAuth         : false,
    groupId              : "6",
    fastestResource      : "ImagingStudy",
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
