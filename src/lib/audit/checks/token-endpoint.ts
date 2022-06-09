import got from "got/dist/source"
import { suiteFunction } from ".."


export const suite: suiteFunction = async function({ config, check }) {

    await check({
        name: 'The token endpoint rejects "http"',
        description: "The token endpoint should be on https and should reject requests to it made via http.",
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
    );
    
}
