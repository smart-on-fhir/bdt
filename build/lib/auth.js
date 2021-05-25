"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Creates and signs an authentication token. Note that this is the low-level
 * method and everything is customizable. That is perfect for testing, but for
 * real life use it may be better to wrap this in another function that only
 * allows meaningful modifications.
 */
function createAuthToken({ algorithm, privateKey, header, claims = {}, expiresIn = "5m", tokenEndpoint, jwksUrl, clientId }) {
    let jwtToken = {
        iss: clientId,
        sub: clientId,
        aud: tokenEndpoint,
        jti: crypto_1.default.randomBytes(32).toString("hex"),
        ...claims
    };
    if (algorithm === undefined) {
        algorithm = privateKey.alg;
    }
    if (!algorithm) {
        throw new Error(`Unable to determine the token sign algorithm. Please provide it as an option`);
    }
    if (!privateKey.kid) {
        throw new Error(`The privatekey has no "kid" property`);
    }
    return jsonwebtoken_1.default.sign(jwtToken, privateKey.toPEM(true), {
        algorithm,
        keyid: privateKey.kid,
        expiresIn,
        header: {
            typ: "JWT",
            alg: algorithm,
            kty: privateKey.kty,
            jku: jwksUrl,
            ...header
        }
    });
}
exports.createAuthToken = createAuthToken;
//# sourceMappingURL=auth.js.map