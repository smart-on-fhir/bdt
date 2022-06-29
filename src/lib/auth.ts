import crypto  from "crypto"
import jwt     from "jsonwebtoken"
import { bdt } from "../../types"



/**
 * Creates and signs an authentication token. Note that this is the low-level
 * method and everything is customizable. That is perfect for testing, but for
 * real life use it may be better to wrap this in another function that only
 * allows meaningful modifications.
 */
export function createAuthToken({
    algorithm,
    privateKey,
    header,
    claims = {},
    expiresIn = "5m",
    tokenEndpoint,
    jwksUrl,
    clientId
}: bdt.createAuthTokenOptions): string {  
    let jwtToken = {
        iss: clientId,
        sub: clientId,
        aud: tokenEndpoint,
        jti: crypto.randomBytes(32).toString("hex"),
        ...claims
    };

    if (algorithm === undefined) {
        algorithm = privateKey.alg as bdt.SupportedJWKAlgorithm
    }

    if (!algorithm) {
        throw new Error(`Unable to determine the token sign algorithm. Please provide it as an option`)
    }

    if (!privateKey.kid) {
        throw new Error(`The privatekey has no "kid" property`)
    }
    
    return jwt.sign(jwtToken, privateKey.toPEM(true), {
        algorithm,
        keyid: privateKey.kid,
        expiresIn,
        header: {
            typ: "JWT",
            alg: algorithm,
            kty: privateKey.kty,
            jku: jwksUrl, // might be undefined, which would remove the jku if no jwksUrl is set!
            ...header
        }
    });
}
