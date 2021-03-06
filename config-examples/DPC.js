// See config-examples/template.js for full list of options and
// their descriptions.
module.exports = {
    name: "DPC API",
    description: "Data at the Point of Care Bulk FHIR API",
    authType: "backend-services", // backend-services|client-credentials|none
    jwksAuth: true,
    baseURL: "https://sandbox.dpc.cms.gov/api/v1",
    tokenEndpoint: "https://sandbox.dpc.cms.gov/api/v1/Token/auth",
    clientId: "W3sidiI6MiwibCI6Imh0dHBzOi8vc2FuZGJveC5kcGMuY21zLmdvdi9hcGkiLCJpIjoiODk5NzBiMDQtMGI4Ni00NGY4LTkzNTUtOWQzMTM2YTFlMmZjIiwiYyI6W3siaTY0IjoiWkhCalgyMWhZMkZ5YjI5dVgzWmxjbk5wYjI0Z1BTQXkifSx7Imk2NCI6IlpYaHdhWEpsY3lBOUlESXdNakV0TURVdE1qZFVNakk2TkRRNk1EVXVNVE00T0RjMVdnIn0seyJpNjQiOiJiM0puWVc1cGVtRjBhVzl1WDJsa0lEMGdNelV4Wm1KaU5XWXRaakptT1MwME1EazBMV0pqTm1ZdE1tSXpOakF3WW1JMU5tVTUifSx7ImwiOiJsb2NhbCIsImk2NCI6IkFxQ0JhSHFnZ1doNmV0cjJmRnRhalg2RWNNaUktUGUydkNGaWNNZjltal9Wcnp0OEJTS1RCRVhzemtLcU11R1lIOEVzNmhjejVleWxOamVzdGhzSHJ2U0NGRnJwTDMwNGpnU2w2YWVZay0xbzJtZDBFWl9SeE1pQkY3S2ZLVHd3S1gxaUdYcjNoRHdCRzJ6UXlDeEJGWnZOdGU2NGFoNGd1aFdkNFVyVm5GV1d4SjZmNkNBZWZsOTBMTTdoc1NxYWxVLUFBM2hnWVhla01lNURWZyIsInY2NCI6IlNaeTI3cm1VeFVJdjlRMXpwZ2FiLU5SWmlIYTRtd09BbWNSaEo5Zkh0bEVfeU5vSXF4V2sxbGlHdlhOZW91QW9FX3N2d2JIcE1DXzhkRExfSFd4TmdBYWNCdlAtSGJsMCJ9XSwiczY0IjoiTEd4a2M2akMtcmtHSjhGSXJqR0tCc25VSFd5X09sTWVaSy1TNXZhUmdGYyJ9XQ==",
    strictSSL: true,
    requiresAuth: true,
    fastestResource: "Group",
    groupId: "e42a540e-f811-411a-b3b5-6c73aadbf9e6",
    scope: "system/*.*",
    privateKey: {
        "kty":"RSA",
        "use":"sig",
        "n":"AMbIMTQqeXIRFcML6BTHzeXAJ5R2HHrZsvKC3_wu14Truyecc-gdjSzKXIROrC93Ee5VG9Ne0UzOsvMi_T5IzczsvOMB1InhxusBWz1mXOHx8QHJxSiQzgXt2TG2Yd9fGlH3_NDrpoG2SP_jt-EJpWjZQ1kbdnNXB_Lhi2-6bn-7LIytvLOZga_zRpWVnLaEKcOhA1uxEJf6ygCv91j2qRuE1-tI7ZjsB-T6zE6gLuqmi8cZMeaY51W3OC2em4INC5wVsJ2jNSu4xWgiV-xRc9-27rbM6hPQ-rj9fgO-nEjGXMr6vCDsS1KS8ji2wB-6Vw6VjLJOlxiG1iQ5J3JzabTkGzLZXCs0iBPMbaVJ3FaVAgd_hyqmNnJhOq6icfkZhWpqybCT50r2t6lIgfBRlgJlIrQ0zqR7UpZAIbYvVeyDS4RBfbLy_wEibfA_GK5Fzz-uPF4-IFuzlwZLLZBjZ6x2XLc4-Ns_klHkkcgCa9X7K27IPWc230kpvJcpdRYwLr61NksWM2glEjPxqZdNW7fRMGPh40ue-s2Yqng6ZzBVTAlbTcnRuyXTjAGHuKRqmsTWLhEzFpwYuW6wLAVdUZhQ_MM113YJsWtrJxmSOnITYMrutlBRq_GaNc5pvvcSdVWkkK_o9OIy7YztV8bnA6GVPIxiKLIoUe7SuLBACOiD",
        "e":"AQAB",
        "d":"dFkCa60crkYPvbz_VwJnoj0pLX1ASCuZ0NYHcdyc6sDrJ1EsikSZuAitxAckQxfnV99azQnnaZRmK2dkYItOYc6C9D_C_f03Z5_AnpyGav0oekp16rtuywufH7jHam2Iw0dqI4J6T9u4uIW5v67csRTRlZs8ZmAfV-rpqTiuqnaMqb6a_2gu_yReQPlz42RR6Z4ZkBaARuRUTbixBtJAwsmrc5yY7PPh3wVohfC95Twb_iniCj2e0Y3PBOybyrAGBpKvcGTxnyij6sKHQdue_eddq4Me0wBzb8l3c4uif_oSn__IE2Ea6Tb3LXjR1QBFKlUgJ9FWINXzCvqk-xlQWbZEutzGHey4kZEPKZmPgFcYqLAmABJSxbwUs0JCiAt8VfUtwcLaLba3YL-lDu_S-XpQuZU88z1oLQS_LGT8TWCbFSs8x6w_oN2kP-RnvJeGxVtqM9SeFGrT-v8A5hi41UjQM3Y_Gky6MuBStLdwOx7ty18i4UYiOzl31479UbT_fhsMCKgfkR2LfvjvLasfbHDnVZhqdtvGbo-J26OUtH2u5Cv3EGqSPtOahnmoqyNAmy4PylqLYdnWKdMtQOmyK_9bvbjIkR87r08rG1Jo-HtSXPO3KAvKGesQd0wbkWJr6uKjxygfY6c9iF65uPlrL9pTSQiE3uroBc_VmPz6OVk",
        "p":"APYBIclq-IXnpSz2vqIwaiXRQiMtFc7OtMQE60k0R9aVD3ofmEJwa9vCe3zVQ9JjOCYgLp4sY3N5j-NrwBBgTAsHPfHIOPp3--x2_7RMcNXpwSp__ENmgYdh5N3p9pxMbiTKZLX-Adhi6MdbT8DWoJx860ct3jqr7K-rsiPbbVG1zW6qMX4KAfHeKvAEHMeLT8gOQIfKi3eNKZwKllTpHRsKSX-0I48Rpf-7-6abD0qkIUlo2s-VnhJdcP0Jx7c43CxHStreWWTp-zXPdn2KfAdkQCispeFeJ-MYyryRXA9AdCB2aPuOb4aAJA39jpfuqE1qUgAzzVaSVTnPSNT88O0",
        "q":"AM7b3bQ-kbs67bHEC67aFjwn8WVNszcMY7FBU5U2jKfWYLx2xGr8PlPicvnaDT2ur9zZsTcaAV-m7bP4JrEVjUUYfUm1oWteN01vgTnCq3dV13LEcWrF27AxRjgzkc_Q8a3d69NgEtvfhXKSyAiivvE9HgXeEqiie_IdHTkW4BexM60b8ul6-mJXxRdO-3OiUfF4Np06W6UlseHAyHP5xEYloIZ7J4Oghu-c_p-r4DSe2wgFq_31DAFGGLg7ZMwwp-XzRNfx0Wy4cgLivFFRGb40WLTOKDu9dmRSh3JZfTUawEAIPu7MTFXHwWDqs_CiItCXzaQkKVBe5gvrIIMOwS8",
        "dp":"D0I4t0aUTbH1k9lmL6czHk9he88TGDXIDpSDh5Hflta-FAQbrJtOhV4FzNNploYi-HJskdENBh-XJjMLwbhHXzO-yt1xc0-3543mBGftY8dQ_PLdUczs4dnXmVAmxMEU3-FR59vuf157M8pdIwftBGfXLB4TN65sSuUqcoDswfG14VRbJ4c1Yaw3G5YVtubUNwNzSzjr96lg2FXrxy6CaKf1sR8aSYh9tGQTktzxUN7nVadUUyXjnR4AoSFXKu0y8uglI3hBMTo2I7tPjS_my4qTVDKJQ3ZUoQhrotCdVjDYQx81Gc1W64_NLLT6gEAEXnDmzy5nYSRIdwJ9cQCTbQ",
        "dq":"H14z5ms-ihfLh5Nk-iTUDlc4QdZggM5-J5jyZcQZ3DGkBbA05MxPX0UNjlnEfEALJwBT4TkuUCTuEsZkh6HvBDVMemryiWeGF1X7UJj2i2gW_a5QTJKoV7WBInCfgdX7cBQg-LKu6WyhvdgIQVb8gXR1Iwqj5bKN_Q7xKYEQhkc2wN9mHIWrhlIs7vXpJ4XLy0QhdAIvd4GZ0dP8EaokW0bFat8uBMXI8HjsG6Zin1gfer3xcNdB9Md-ZCGNjXErZLFZFS30RfpKP6nGSMZ1kuQ5N2GztCts0pW5OFvdornlwU_-yxNr1-4sote0ZZ8QjHUYl_Vr1mYtmE0VZwpLvQ",
        "qi":"Gv6sUcdZYmMEMHzbtSYW8Thp-oDlsnrPnqZLcitsKo_gKg3PBfWHyC2jmf1gnETnHHK1l3GOdJo-QWln6Krs1xlqfVEnpRvMMK0gI3Nsc1wFfzgOnM9JPci3bkCX7oYCi3n33TkvygC43LoHY674VCYKaWzUzsPaCYTMt6QVJiUQmBcu6smzJTr77fSuxkWp1rOZmRGLx1rPlyvJKOF8xFqBywJbmQKkzcEJTnyy2MR9jUeLSB5YJXBGG0IBjGgbvu2XUedANx91WyqoWudHY6_-d7MJp3Awq6OYiBv7qoYcJvPfxgKCKrWJdM1nCG_MDhc9EuiWSX98RFuXTxGTxg",
        key_ops: [
            "sign"
        ],
        kid: "0d4b972d-1fc5-4231-95dc-1d561de68e0c",
        alg: "RS384"
    },
    groupExportEndpoint  : "Group/e42a540e-f811-411a-b3b5-6c73aadbf9e6/$export",
};