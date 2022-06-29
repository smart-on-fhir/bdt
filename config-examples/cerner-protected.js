
/*
(Open, R4) 
https://fhir-open.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient/$export

(Secure, R4) 
Token Request: https://fhir-ehr.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d/token
Patient Export: https://fhir-ehr.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d/Patient/$export

Example Registered Client:
Client Id: smarthealthit_rs384
Public Key: https://bulk-data.smarthealthit.org/keys/RS384.public.json
Private Key: https://bulk-data.smarthealthit.org/keys/RS384.private.json
*/

/**
 * @type { import("../types").bdt.ServerConfig }
 */
module.exports = {
    baseURL: "https://fhir-ehr.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d",

    authentication: {
        type: "backend-services",
        clientId: "smarthealthit_rs384",
        tokenEndpoint: "https://fhir-ehr.stagingcerner.com/beta/ec2458f2-1e24-41c8-b71b-0e701af7583d/token",
        privateKey: {
            "kty": "RSA",
            "alg": "RS384",
            "n": "wYrXh4-wDtTS7tPVxNdl0mAyCd_IEUECR1Ew91b7BQYwow2at4L8PEQ1bRaGSxWATuviaD0Y9UhLzJ2DPMRDUzbao1evCkrKs-yY1ox1xPeNl8cE9RMTZIcGcAS4r8O_DlM4z-yNhUENi5vsY1qPPfde28FObAH3wr7e63viU-LUpJxJmTb5dSGWIearyDg9H8wZpQAR9k2GrZxqqS17mzEiEqtxUpiw26ABShqJQ4xgOAQoiE7WV3yvf36AqpcO2WtwwS6xwcLw55oZzou3MT2aGZPmNZkdyisGOU9A01REwrwxw6TVbabrb2kIINfDE-Wyes2ZocTJb_zNUZN5xw",
            "e": "AQAB",
            "d": "Bq-dMnmsQ1bm0olO4TXvtozMLbslVjNAuOX9Iw5GLa5BD-Dwb1Z_EDXrApG8oetkO1W6xI8XxaFxvOfUGM1O5hkHBI2K5nge-Ig7322Kw_spUQz3BuBZ0yc2-bewCaJhf0UwuT4axXex2BjS2bvPJvzcsgrDgseun3Ooj8n_z5X_DreQBSrKNpns6MG-9FQhkTDLt-aaYkrL0njXN3LnxhuvMjrCUEy8jCLaDHpPdiThTxGlIu4z5mw_RraMIU3uesXDJQHuaKN6j7Lqwy0qlnmEy5WchTikAyfAwLWSMAS7GL16SX9Wxqk3WCNbSMlOTy0NdBvdjKIH5akYJjUfQQ",
            "p": "5xfttF1T_iP8TanFDewG7Xln9dz415nj89W6zDx3FxDMzbgQscQTDPdlYuMQaoZKgZ6RmDTNP0YxMilfhIs17sJ7ORaKF6ssraS_CEuBnS65zwzAB6iT5mguX8ZnPF_Qbob2pTKXRxUkXHEYJfVZnbRFvQ9APBabtEg9ABqTaL0",
            "q": "1mbYVkg7s7Jfr0omLBlbKQ4m-hdetxf7bSjEexzeSGIy4bTXvzX6sHUIKrC5KnKW9pOvmcJkxnzsxHbuuEt4q1FB3cxxjvFJAqz6c2xuw6lmefbYYWWKDVecUkT2Kc_n5P4xwg2z-GjLJs_gU64jyfSArdNua_XzMwqwq9LmHtM",
            "dp": "ifXyFexlmWI4XNEOcCpJVHpXQyOBd41K1iXxl749RorkCahqZwXsbaBAadGu2jmDv3A_8UMMiUrJUe37NTC6qOh4EfPPyyOIz717wmL5ZTIhAWfWOHw-l534mXrj5No6n9F469SRFYGcrIdj6D1aG9kkjSLOsVC58d3ydN5oxG0",
            "dq": "0vXNJlDa1bzMo6jdGIU2ipYPSgNWweeKEGWNtum32hcto6KSquVNLvVovMC44Yhw_Fxi63M4P4nKWqH_0D0Kld9VZQ12K0VFJqnXoVzvO_ziBV4amPMVPH2ZJeYPJSMaNNrdUOi0zdcnFaBzRUNSmbPILcGdpAMUcoOxRNA2d9s",
            "qi": "L-GcGJ5s6XGofwfFE0HRdGg6UEwDuHUJo6hwksG9nc-AqLcNIvJ15Q90dfaqRN1UUza2zYiy7W1I3Vq4Z6OHguXQmdDHTCqCrGJLprvm9x473y2I55MVJ2JsjwPJePVNrJB_KF0zDYY6uYSSL8nTxLmXLBhxvLpKjBb3lkLDpBg",
            "key_ops": [
                "sign"
            ],
            "ext": true,
            "kid": "6cf70879258f9c656bb7ccc65802d099"
        }
    },
    fastestResource      : "Patient",
    patientExportEndpoint: "Patient/$export"
};
