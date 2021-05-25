/// <reference path="../index.d.ts" />

const { authentication } = require("./careevolution");

/*
(Open R4)

https://r4devbulk.dynamicfhirsandbox.com/fhir/dhit/practicetwo/r4/open/Patient/$export

(Secure R4)
https://r4devbulk.dynamicfhirsandbox.com/fhir/dhit/practicetwo/r4/Patient/$export

Token endpoint
https://r4devbulkauth.dynamicfhirsandbox.com/core/connect/token

Registered Client:

Client Id: PracticeZero-1-BulkDataTest

kid : "Js8DoUuhEBaOOyJsTqTyOQofRLc"
x5t : "Js8DoUuhEBaOOyJsTqTyOQofRLc"

JWKS endpoint

https://r4devbulkauth.dynamicfhirsandbox.com/core/.well-known/jwks

Public Key:

-----BEGIN CERTIFICATE-----
MIICcDCCAdmgAwIBAgIUYqIZLEy9aMZNpq1hA5ChbMEWbt8wDQYJKoZIhvcNAQEL
BQAwSjELMAkGA1UEBhMCdXMxCzAJBgNVBAgMAmxhMRQwEgYDVQQHDAtuZXcgb3Js
ZWFuczEYMBYGA1UECgwPQnVsa19EYXRhX1Rlc3QzMB4XDTIxMDExODIyNTIxMVoX
DTIyMDExODIyNTIxMVowSjELMAkGA1UEBhMCdXMxCzAJBgNVBAgMAmxhMRQwEgYD
VQQHDAtuZXcgb3JsZWFuczEYMBYGA1UECgwPQnVsa19EYXRhX1Rlc3QzMIGfMA0G
CSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0SjOnNKL0+kYswbk6mCGR4NlftlxbWCw8
SkvFxQHe+aor6JfwMnJWYk+4cx0R9YzDC0oLiRu7lAxRdpTDzJZPDwDqAhEY7Vln
oIGrtTYfBmTAXIR3O+n3cqslAHtXcVQ+wy+0hFj4MPYw42SbtclzKSbBk0HhkeGk
gMmxqCq6YwIDAQABo1MwUTAdBgNVHQ4EFgQUIPUCz0AM/YZmCcqODHo6Jdt/rT8w
HwYDVR0jBBgwFoAUIPUCz0AM/YZmCcqODHo6Jdt/rT8wDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOBgQCp+0HZnXjDmvyWhWxXNADDXo1qEtrHAS3MCFwU
Xpt9drpHwtXoHV1TJdxYssCkNsWUiXm9ILPZOV96IJTPXOCgaold107nsaVfS42C
MyrzB6WSuqvMe9UCLGlaxZLWDLV0k5etUyRZEWWoOJWKP+ZruADMvrVVNJ5gAxTR
CyaMkQ==
-----END CERTIFICATE-----

Private Key: 

-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQC0SjOnNKL0+kYswbk6mCGR4NlftlxbWCw8SkvFxQHe+aor6Jfw
MnJWYk+4cx0R9YzDC0oLiRu7lAxRdpTDzJZPDwDqAhEY7VlnoIGrtTYfBmTAXIR3
O+n3cqslAHtXcVQ+wy+0hFj4MPYw42SbtclzKSbBk0HhkeGkgMmxqCq6YwIDAQAB
AoGADmHM9Q2x4jEE4BUkHZR9ORHixUva2j6SaMzUdpZcq9jmxlHrrPGZRWLaUTB9
pS0daYHBCmKJn9ETmnwHKgdsBggsCWLEB8qnWNl3tuQeGDZhhlh2RCvDMxHY3fDZ
izfxj1UgXMQJS5qltepWWIUhHhg5O/EK89NHsEH7ko51DIECQQDjKLKG2VssWqT1
f5iVRwpy7Ur8D99i7+9p5whF4ED67jZS4ouBLCvo7lEtNdpAzo0UWxAGF6VMsD82
6d3gOrTTAkEAyy4gbXAGrm4JunQ/mFg+3D6e/9zDn2wVf3cldX1P+ZefhH2klfmx
pWVGikuas2HEhaYUKFjPQhU2lw4Gm36qMQJAR2w+ZcPltNZzU3VhBl6l3Gjb0NE0
zajfQA8SPNY72CoaDomIj37R95UnFO3/x6yqEyJmsWOx56Dq31s9FgmfXQJBALSF
QyJ4yjboZZRX/Ljqjs84hCRojRZz/ZXG0m1U7V2hLYWV7EmkFAYTuVzeV5DRaL4m
FPrUDTF1j48eUxiMrcECQQCAf+bVPtglWb+omDb6SrlXZANTGiwCoP1x2VnhsfmP
slrW3tknKp7HGtXSJeEwUaBySpyVqLSfe5aCfOx/YDJ6
-----END RSA PRIVATE KEY-----

*/

/**
 * @type { BDT.ServerConfig }
 */
module.exports = {
    baseURL: "https://r4devbulk.dynamicfhirsandbox.com/fhir/dhit/practicetwo/r4",
    patientExportEndpoint: "Patient/$export",

    authentication: {
        type: "backend-services",
        clientId: "PracticeZero-1-BulkDataTest",
        privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQC0SjOnNKL0+kYswbk6mCGR4NlftlxbWCw8SkvFxQHe+aor6Jfw
MnJWYk+4cx0R9YzDC0oLiRu7lAxRdpTDzJZPDwDqAhEY7VlnoIGrtTYfBmTAXIR3
O+n3cqslAHtXcVQ+wy+0hFj4MPYw42SbtclzKSbBk0HhkeGkgMmxqCq6YwIDAQAB
AoGADmHM9Q2x4jEE4BUkHZR9ORHixUva2j6SaMzUdpZcq9jmxlHrrPGZRWLaUTB9
pS0daYHBCmKJn9ETmnwHKgdsBggsCWLEB8qnWNl3tuQeGDZhhlh2RCvDMxHY3fDZ
izfxj1UgXMQJS5qltepWWIUhHhg5O/EK89NHsEH7ko51DIECQQDjKLKG2VssWqT1
f5iVRwpy7Ur8D99i7+9p5whF4ED67jZS4ouBLCvo7lEtNdpAzo0UWxAGF6VMsD82
6d3gOrTTAkEAyy4gbXAGrm4JunQ/mFg+3D6e/9zDn2wVf3cldX1P+ZefhH2klfmx
pWVGikuas2HEhaYUKFjPQhU2lw4Gm36qMQJAR2w+ZcPltNZzU3VhBl6l3Gjb0NE0
zajfQA8SPNY72CoaDomIj37R95UnFO3/x6yqEyJmsWOx56Dq31s9FgmfXQJBALSF
QyJ4yjboZZRX/Ljqjs84hCRojRZz/ZXG0m1U7V2hLYWV7EmkFAYTuVzeV5DRaL4m
FPrUDTF1j48eUxiMrcECQQCAf+bVPtglWb+omDb6SrlXZANTGiwCoP1x2VnhsfmP
slrW3tknKp7HGtXSJeEwUaBySpyVqLSfe5aCfOx/YDJ6
-----END RSA PRIVATE KEY-----`
    }
}

