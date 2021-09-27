import got from "got/dist/source"
import { OptionsWithUrl } from "request"
import { suiteFunction } from ".."
import { BulkDataClient } from "../../BulkDataClient"
import { urlHasNoPassword, urlHasNoUsername, urlIsHttps } from "../lib"


export const suite: suiteFunction = async function({ config, check }) {

    // const client = new BulkDataClient(config, {})

    // const validRequestOptions: OptionsWithUrl = {
    //     url: config.authentication.tokenEndpoint,
    //     method: "POST",
    //     headers: {
    //         "content-type": "application/x-www-form-urlencoded"
    //     },
    //     form: {
    //         grant_type           : "client_credentials",
    //         client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    //         scope                : config.authentication.scope,
    //         client_assertion     : client.createAuthenticationToken({
    //             claims: config.authentication.customTokenHeaders,
    //             // algorithm: config.authentication.tokenSignAlgorithm,
    //             header: {
    //                 ...config.authentication.customTokenHeaders
    //             }
    //         })
    //     }
    // }

    await check({
        name: 'The token endpoint rejects "http"',
        weights: { security: 4, reliability: 4 }
    }, async () => {
            const tokenEndpoint = config.authentication?.tokenEndpoint
            if (!tokenEndpoint || !tokenEndpoint.startsWith("https://")) return false
            return got(tokenEndpoint.replace(/^https\:/, "http:"), {
                method: "POST",
                json: {}
            }).then(() => false, () => true)
        }
    )

    await check({
        name: 'The token endpoint requires "application/x-www-form-urlencoded" POST body',
        weights: { security: 4, reliability: 3, compliance: 5 }
    }, async () => {
            const tokenEndpoint = config.authentication?.tokenEndpoint
            if (!tokenEndpoint) return false
            return got(tokenEndpoint, {
                method: "POST",
                headers: {
                    "content-type": "text/html"
                },
                json: {}
            }).then(() => false, () => true)
        }
    )

    // [
    //     "grant_type",
    //     "client_assertion_type",
    //     "scope",
    //     "client_assertion"
    // ]
    
    // await check(
    //     'The token endpoint "grant_type" parameter must be present',
    //     { security: 5, reliability: 3, compliance: 5 },
    //     async () => {
    //         const tokenEndpoint = config.authentication?.tokenEndpoint
    //         if (!tokenEndpoint) return false
    //         return got(tokenEndpoint, {
    //             method: "POST",
    //             headers: {
    //                 "content-type": "text/html"
    //             },
    //             json: {
    //                 client_assertion_type
    //             }
    //         }).then(() => false, () => true)
    //     }
    // )
}
