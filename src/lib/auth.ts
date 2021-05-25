import crypto from "crypto"
import jwt    from "jsonwebtoken"
import jose   from "node-jose"

export type SupportedJWKAlgorithm = 'RS256'|'RS384'|'RS512'|'ES256'|'ES384'|'ES512'

export interface AuthTokenClaims extends Record<string, any> {
    
    /**
     * Should equal the `ClientID`
     */
    iss?: string

    /**
     * Should equal the `ClientID`
     */
    sub?: string

    /**
     * Should equal the token endpoint
     */
    aud?: string

    /**
     * An unique random string
     */
    jti?: string
}

export interface AuthTokenHeader extends Record<string, any> {
    
    /**
     * **NOTE**: This must be `"JWT"` but is defined as any `string`
     * here, because tests may want to try other values
     */
    typ?: string

    /**
     * The sign algorithm. Should be valid alg but is defined as any
     * `string` here, because tests may want to try other values
     */
    alg?: string

    /**
     * This should be the private key `kty` ("key id")
     */
    kty?: string

    /**
     * This should only be set if JWKS URL auth is supported.
     * It is the https URL where the public keys can be located.
     */
    jku?: string
}

export interface createAuthTokenOptions {
    
    /**
     * The token endpoint url
     */
    tokenEndpoint: string

    /**
     * The clientID
     */
    clientId: string

    /**
     * The private key object
     */
    privateKey: jose.JWK.Key

    /**
     * The algorithm to sign with.
     * If not provided, the `alg` property of the `privateKey`
     * will be used, if it exists and if the private key is JWK.
     * Otherwise an exception is thrown.
     * 
     * The specifications recommends **RS384** or **ES384** but
     * we allow more.
     * 
     * @see [[SupportedJWKAlgorithm]] for acceptable values
     */
    algorithm?: SupportedJWKAlgorithm

    /**
     * Any properties to add to the token header.
     * 
     * **WARNING**: because test would want to mess with the
     * tokens to see if the server would detect, we allow every
     * single header property to be overridden. For successful
     * authentication avoid setting these in the header:
     * - typ
     * - alg
     * - kty
     * - jku
     */
    header?: AuthTokenHeader

    /**
     * Any properties to add to the token claims.
     * 
     * **WARNING**: because test would want to mess with the
     * tokens to see if the server would detect, we allow every
     * single claim to be overridden. However, for successful
     * authentication avoid setting these claims:
     * - iss
     * - sub
     * - aud
     * - jti
     */
    claims?: AuthTokenClaims

    /**
     * The https URL where the public keys can be located
     * Only used for JWKS URL auth
     */
    jwksUrl?: string

    /**
     * Expressed in seconds or a string describing a time span (Eg: `60`,
     * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
     * a seconds count. If you use a string be sure you provide the time
     * units (days, hours, etc), otherwise milliseconds unit is used by
     * default ("120" is equal to "120ms").
     * If not provided, we will use "5m" as default.
     * @see [zeit/ms](https://github.com/zeit/ms)
     */
    expiresIn ?: string | number
}

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
}: createAuthTokenOptions): string {  
    let jwtToken = {
        iss: clientId,
        sub: clientId,
        aud: tokenEndpoint,
        jti: crypto.randomBytes(32).toString("hex"),
        ...claims
    };

    if (algorithm === undefined) {
        algorithm = privateKey.alg as SupportedJWKAlgorithm
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
