"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const suite = async function configCheck({ config, check }) {
    check("tokenUrl uses https", { security: 5, reliability: 3 }, lib_1.urlIsHttps(config.authentication?.tokenEndpoint));
    check("tokenUrl does not include username", { security: 5, reliability: 5 }, lib_1.urlHasNoUsername(config.authentication?.tokenEndpoint));
    check("tokenUrl does not include password", { security: 5, reliability: 5 }, lib_1.urlHasNoPassword(config.authentication?.tokenEndpoint));
    check("Uses backend-services authentication", { compliance: 5 }, () => config.authentication.type === "backend-services");
    check("Authentication is required", { security: 5 }, () => config.authentication.type !== "none" && !config.authentication.optional);
    check("Uses a recommended token sign algorithm", { compliance: 5 }, () => (!config.authentication.tokenSignAlgorithm ||
        config.authentication.tokenSignAlgorithm === "RS384" ||
        config.authentication.tokenSignAlgorithm === "ES384"));
    check("Does not require custom token headers", { compliance: 3 }, () => Object.keys(config.authentication.customTokenHeaders || {}).length === 0);
    check("Does not require custom token claims", { compliance: 3 }, () => Object.keys(config.authentication.customTokenClaims || {}).length === 0);
    check("Uses JWK private key", { compliance: 5 }, () => config.authentication.privateKey && typeof config.authentication.privateKey === "object");
    check("Supports JWKS URL authorization", { reliability: 3 }, () => !!config.authentication.jwksUrl);
    if (config.authentication?.jwksUrl) {
        check("jwksUrl uses https", { security: 5, reliability: 3 }, lib_1.urlIsHttps(config.authentication.jwksUrl));
    }
    check("Does not require clients to request write scopes", { compliance: 3, security: 5, reliability: 3 }, () => !(config.authentication?.scope || "").match(/\/.*?\.(write|\*)\b/));
};
exports.default = suite;
//# sourceMappingURL=config%20copy.js.map