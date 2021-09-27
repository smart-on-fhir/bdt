/// <reference path="../index.d.ts" />

/**
 * Use this to template define new configurations
 * @type { import("../src/lib/Config").ServerConfig }
 */
module.exports = {

    baseURL: "https://fhir.careevolution.com/Master.Adapter1.WebClient/api/fhir-r4",
    systemExportEndpoint: "",
    patientExportEndpoint: "Patient/$export",
    groupExportEndpoint: "",
    fastestResource: "Patient",
    // groupId: "",
    
    authentication: {
        type: "backend-services",
        optional: false,
        clientId: "JWTClientCredentials",
        tokenEndpoint: "https://fhir.careevolution.com/Master.Adapter1.WebClient/identityserver/connect/token",
        tokenSignAlgorithm: "RS256",
        customTokenHeaders: {
            "x5t": "kd_Uob1ueoByiUFZQaiS8tPdto4="
        },
        // The Private Key as JWK or PEM. Required if authType is set to
        // "backend-services" and ignored otherwise.
        privateKey: `-----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEAwrF3meoSKUq1Qcxh7CZg20koes44qou146J2b9G2Mo0HtEnC
        kDI3w+BhDUzXK6cGVKAyjyqUCYv4JFkBxGj9w6Da6i37CTyz5Q6IZ49bNDfTp6bU
        xhYRaBZzaZLlepFAWMhgOA0PTu6G+m5XyrCBR2CqnRxMu43hnfIMc3xW6hjgaeJU
        bBCG/JrwztD3h82FLvlfR2k0ZW43PYoqT4qVSsF6T3tU3Im6ckCOTlNV9aWvEx2Y
        eBrgGx5Mr64fKCSUo3euAW4XxCR4pbtkt8vtOriGvDGkgMOdpT12ruygxQdlHlS/
        jbqHhx435u24hOcmr38dzgXcN7Ib7rSKtQ2O4wIDAQABAoIBACke9pXpnGBgSRxW
        oLASAw8NyqD1gX5z97zWiZFgh8zxgJkRoyh1ktWqRJVcj23G301scIFQiufhSk3T
        Bs6HJmH1TYd8orL2wUA165WD7819pRSZ5gLYkmCbrVC1GAblOuQFnlz4VS1kr9mh
        CKXk1clPn3mDiqlqdCa6Aus5bdoPfHkxhyeJbBFo2HegFdsmcrrgZa1EldYYArTu
        DDU2N+zBpzVDpsoy3HPXp6Pjo1w3LSsQKF9Ny2XltnHdGGe/b+Pyh+3b9GhZ6Seb
        yxn5m0sBb4ncMFZDeYDj4hK2hFehghPazWT+NWsmukOIt6kfM0POxFPnOJXW9mez
        zyEezpECgYEA7/Lg2fLhkez5iak/q7DTgsY67VbipnhUwIk5eV0uYHJh/w6pg/uo
        ViRJ7HVF8ush77PPOv6gionIAzdsadsijG2KrNBIqxnlNutkRhTFrduiRFTN/uL8
        4RkXOxqyzhUCltErT5B2/OGKW+T/rGYzkVt6I9RfIYc33wMCmGKJYJ8CgYEAz7eW
        nHJK9xR/AWsrn5jBdKSumoXFV1Fqh0uDAxNiI/9LBvruhK8jCPdL5rFNdyptFbMs
        H7aLHT1HHX9w5qpVctxnqXvwmXPxCM+XZKk5tm1jXwJgryas9abK7SbNRzMlqEnj
        /HoSVrnrM3HEHeof17Rf93KTheL5xWW3qhpU1z0CgYEA7XHGakb8SyBbK4vNkwQv
        ukiZxYXmUd/f1ou00VGRdCWcrf5/ZzkgsuXENXczmhhug7rGxlV03sNLp0swQGx2
        espnoW2Xi6HbfoZfuy4RFGO05rOZCbLrlYDzySw5Zs/JuR8SIfEOnl4+QYOSMrMM
        Mrp4Wn5tCUu60Tg0WEGiOncCgYEAk6cTHp53/27IYT/HQKmbSskNfLX+c3ViXk4l
        EPikWKZOtOWGyzablvIDODdss3qrFDPK97gQ53X5qVQ/8xe9qepWnbmGa+5otjSq
        j1ljtvPHIXBVPewmInCv6ygb37LR3/C2aXB0vMVoFaeXGxSkEfccCI+fohqYJeOK
        TRZunJkCgYAxIGFRbutiaj6UfhcnlQqDweINVAqdAIxt8nM4vJdtVoIzs8jZdQap
        yRutayhUvBV2gp/mIXts2fjVZNP6OQbMyMxqJhR4mU+t3byZ7btrL35Lt9aaLg0d
        JM1+//zpCVq1zc63j+VQ8Wt/psRwAuUoWk/b1AbkeKIYRVFy/H/9MQ==
        -----END RSA PRIVATE KEY-----`
    },




};
