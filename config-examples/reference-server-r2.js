// This file will configure BDT to test a DSTU2 instance of the
// reference bulk data server (https://bulk-data.smarthealthit.org)
module.exports = {

    // REQUIRED: The full URL of the server to which we can append "/$export".
    baseURL: "https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1IjoyLCJkZWwiOjB9/fhir",

    // REQUIRED. Can be "backend-services", "client-credentials" or "none".
    // - If "none" no authorization will be performed and all the authorization
    //   tests will be skipped.
    // - If "client-credentials" most of the authorization tests will be skipped.
    // - If "backend-services" (default) all tests will be executed. `jwks` or
    //   `jwksUrl` auth must be supported in this case.
    authType: "backend-services",

    // REQUIRED: The full URL of the token endpoint
    tokenEndpoint: "https://bulk-data.smarthealthit.org/auth/token",

    // REQUIRED: The registered Clint ID
    clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoidzRnTTUyZUE4S0xoUVoyNTgxNmpnV2dHb3U0V1ZRVmRLVk5rUGZTLWNMdU9IRnJlRW5vb1EycHBSNm9kS3lXTiIsInkiOiJuQWw1c1Bmd1YxLW9oaTlYbWRYSHcxa0JEX0I0Tm1sWEVtWmZaNE9TR3lyZjZQeFNhSmxsZDVWUDl3WUE2Y0d0Iiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiI3MmIzMWZmMGY2N2I3ZjI4MDU4NDNkMTIwZTIzNWExZSIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6IkxZaXdEVWtrTXZKRVNYZ1VwTW16cERoVS1NeEhNcEtoeFdZNU50ZTc3NXNBQ2ViVVg3cklQeU1OeFZaWnBka3YiLCJ4IjoidzRnTTUyZUE4S0xoUVoyNTgxNmpnV2dHb3U0V1ZRVmRLVk5rUGZTLWNMdU9IRnJlRW5vb1EycHBSNm9kS3lXTiIsInkiOiJuQWw1c1Bmd1YxLW9oaTlYbWRYSHcxa0JEX0I0Tm1sWEVtWmZaNE9TR3lyZjZQeFNhSmxsZDVWUDl3WUE2Y0d0Iiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiNzJiMzFmZjBmNjdiN2YyODA1ODQzZDEyMGUyMzVhMWUiLCJhbGciOiJFUzM4NCJ9XX0sImFjY2Vzc1Rva2Vuc0V4cGlyZUluIjoxNSwiaWF0IjoxNjA4NzUwNzEyfQ.nLFoxnT-lClKwfW4Y-RSxdA6jxCuM5lnM_DzFsFVdl4",
    
    // Set this to false to allow tests to accept self-signed certificates.
    strictSSL: false,

    // Set this to false if your server does not require authentication
    requiresAuth: false,

    // Enter the ID of the Group used for testing. Keep this empty if the server
    // does not support group-level export.
    groupId: "b0fdb80e-c653-48d9-8e2e-b97d784be40c",

    // While testing we need to attempt downloading at least one resource type.
    // Please enter the resource type that would be fast to export (because
    // there are not many records of that type). If the server does not support
    // system-level export, please make sure this resource type is accessible
    // through the patient-level or the group-level export endpoint. We use
    // "Patient" by default, just because we presume that it is present on every
    // server.
    fastestResource: "ImagingStudy",

    // The Private Key as JWK
    privateKey: {
        "kty": "EC",
        "crv": "P-384",
        "d": "LYiwDUkkMvJESXgUpMmzpDhU-MxHMpKhxWY5Nte775sACebUX7rIPyMNxVZZpdkv",
        "x": "w4gM52eA8KLhQZ25816jgWgGou4WVQVdKVNkPfS-cLuOHFreEnooQ2ppR6odKyWN",
        "y": "nAl5sPfwV1-ohi9XmdXHw1kBD_B4NmlXEmZfZ4OSGyrf6PxSaJlld5VP9wYA6cGt",
        "key_ops": [
            "sign"
        ],
        "ext": true,
        "kid": "72b31ff0f67b7f2805843d120e235a1e",
        "alg": "ES384"
    }
};