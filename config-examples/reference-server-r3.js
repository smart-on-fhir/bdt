// This file will configure BDT to test a STU3 instance of the
// reference bulk data server (https://bulk-data.smarthealthit.org)
module.exports = {
    baseURL: "https://bulk-data.smarthealthit.org/eyJlcnIiOiIiLCJwYWdlIjoxMDAwMCwiZHVyIjoxMCwidGx0IjoxNSwibSI6MSwic3R1IjozLCJkZWwiOjB9/fhir",
    authType: "backend-services",
    tokenEndpoint: "https://bulk-data.smarthealthit.org/auth/token",
    clientId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJlZ2lzdHJhdGlvbi10b2tlbiJ9.eyJqd2tzIjp7ImtleXMiOlt7Imt0eSI6IkVDIiwiY3J2IjoiUC0zODQiLCJ4IjoidzRnTTUyZUE4S0xoUVoyNTgxNmpnV2dHb3U0V1ZRVmRLVk5rUGZTLWNMdU9IRnJlRW5vb1EycHBSNm9kS3lXTiIsInkiOiJuQWw1c1Bmd1YxLW9oaTlYbWRYSHcxa0JEX0I0Tm1sWEVtWmZaNE9TR3lyZjZQeFNhSmxsZDVWUDl3WUE2Y0d0Iiwia2V5X29wcyI6WyJ2ZXJpZnkiXSwiZXh0Ijp0cnVlLCJraWQiOiI3MmIzMWZmMGY2N2I3ZjI4MDU4NDNkMTIwZTIzNWExZSIsImFsZyI6IkVTMzg0In0seyJrdHkiOiJFQyIsImNydiI6IlAtMzg0IiwiZCI6IkxZaXdEVWtrTXZKRVNYZ1VwTW16cERoVS1NeEhNcEtoeFdZNU50ZTc3NXNBQ2ViVVg3cklQeU1OeFZaWnBka3YiLCJ4IjoidzRnTTUyZUE4S0xoUVoyNTgxNmpnV2dHb3U0V1ZRVmRLVk5rUGZTLWNMdU9IRnJlRW5vb1EycHBSNm9kS3lXTiIsInkiOiJuQWw1c1Bmd1YxLW9oaTlYbWRYSHcxa0JEX0I0Tm1sWEVtWmZaNE9TR3lyZjZQeFNhSmxsZDVWUDl3WUE2Y0d0Iiwia2V5X29wcyI6WyJzaWduIl0sImV4dCI6dHJ1ZSwia2lkIjoiNzJiMzFmZjBmNjdiN2YyODA1ODQzZDEyMGUyMzVhMWUiLCJhbGciOiJFUzM4NCJ9XX0sImFjY2Vzc1Rva2Vuc0V4cGlyZUluIjoxNSwiaWF0IjoxNjA4NzUwNzEyfQ.nLFoxnT-lClKwfW4Y-RSxdA6jxCuM5lnM_DzFsFVdl4",
    strictSSL: false,
    requiresAuth: false,
    groupId: "ad44e371-4d6d-486d-aebe-3fd29fffdf58",
    fastestResource: "ImagingStudy",
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