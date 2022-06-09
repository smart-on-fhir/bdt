"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suite = void 0;
const lib_1 = require("../lib");
const suite = async function ({ config, check }) {
    check({
        name: "tokenUrl uses https",
        description: "It is strongly recommended that the token endpoint uses https",
        weights: { security: 5, reliability: 3 }
    }, lib_1.urlIsHttps(config.authentication?.tokenEndpoint));
    check({
        name: "tokenUrl does not include username",
        description: "Including a basic auth username or password in the URL is considered a bad practice",
        weights: { security: 5, reliability: 5 }
    }, lib_1.urlHasNoUsername(config.authentication?.tokenEndpoint));
    check({
        name: "tokenUrl does not include password",
        description: "Including a basic auth username or password in the URL is considered a bad practice",
        weights: { security: 5, reliability: 5 }
    }, lib_1.urlHasNoPassword(config.authentication?.tokenEndpoint));
    check({
        name: "Uses backend-services authentication",
        weights: {
            compliance: {
                weight: 4,
                description: "Using SMART Backend Services Authorization is strongly recommended for Bulk Data servers"
            }
        }
    }, () => config.authentication.type === "backend-services");
    check({
        name: "Authentication is required",
        description: "Even though authentication is optional for bulk data servers, using a server without authentication is insecure",
        weights: { security: 5 }
    }, () => config.authentication.type !== "none" && !config.authentication.optional);
    check({
        name: "Uses a recommended token sign algorithm",
        weights: {
            compliance: {
                weight: 3,
                description: "Only RS384 and ES384 algorithms are currently recommended by the spec. " +
                    "Using other algorithms is allowed, but would reduce the compliance score."
            }
        }
    }, () => (!config.authentication.tokenSignAlgorithm || config.authentication.tokenSignAlgorithm === "RS384" ||
        config.authentication.tokenSignAlgorithm === "ES384"));
    check({
        name: "Does not require custom token headers",
        description: "Using custom token headers is allowed, but would reduce the compliance score as such an implementation is somewhat proprietary.",
        weights: { compliance: 3 }
    }, () => Object.keys(config.authentication.customTokenHeaders || {}).length === 0);
    check({
        name: "Does not require custom token claims",
        description: "Using custom token claims is allowed, but would reduce the compliance score as such an implementation is somewhat proprietary.",
        weights: { compliance: 3 }
    }, () => Object.keys(config.authentication.customTokenClaims || {}).length === 0);
    check({
        name: "Uses JWK private key",
        description: "The private key can also be specified as a PEM string. In that case it will be internally converted to JWK, but such a conversion is not very reliable. " +
            "Using keys other than JWK means the server does not follow the spec, thus it reduces the compliance score.",
        weights: { compliance: 5 }
    }, () => config.authentication.privateKey && typeof config.authentication.privateKey === "object");
    check({
        name: "Supports JWKS URL authorization",
        weights: {
            reliability: {
                weight: 3,
                description: "Using JWKS URL Authorization is strongly recommended for Bulk Data servers. " +
                    "It allows clients to rotate their public kays as needed, thus increasing the overall reliability."
            }
        }
    }, () => !!config.authentication.jwksUrl);
    if (config.authentication?.jwksUrl) {
        check({
            name: "jwksUrl uses https",
            description: "Public keys must be hosted on tls/ssl protected URLs. Http URLs would work too, but that is insecure and " +
                "reduces the security and reliability scores.",
            weights: { security: 5, reliability: 3 }
        }, lib_1.urlIsHttps(config.authentication.jwksUrl));
    }
    check({
        name: "Does not require clients to request write scopes",
        description: "Some servers require clients to request scopes which imply write access (for example 'system/*.*'). That " +
            "incorrect and reduces the compliance, security and reliability scores.",
        weights: { compliance: 3, security: 5, reliability: 3 }
    }, () => !(config.authentication?.scope || "").match(/\/.*?\.(write|\*)\b/));
};
exports.suite = suite;
//# sourceMappingURL=config.js.map