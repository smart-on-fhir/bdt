"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
// const config = require("../../config-examples/careevolution.js")
// const config = require("../../config-examples/reference-local-r4")
const config = require("../../config-examples/reference-server-r4");
const _score = {
    security: { current: 0, total: 0, log: [] },
    compliance: { current: 0, total: 0, log: [] },
    reliability: { current: 0, total: 0, log: [] },
    performance: { current: 0, total: 0, log: [] }
};
async function check(name, weights, fn) {
    _score.security.total += weights.security || 0;
    _score.compliance.total += weights.compliance || 0;
    _score.reliability.total += weights.reliability || 0;
    _score.performance.total += weights.performance || 0;
    const result = await fn();
    if (result === true) {
        if (weights.security) {
            _score.security.current += weights.security;
            _score.security.log.push({ label: name, pass: true });
        }
        if (weights.compliance) {
            _score.compliance.current += weights.compliance;
            _score.compliance.log.push({ label: name, pass: true });
        }
        if (weights.reliability) {
            _score.reliability.current += weights.reliability;
            _score.reliability.log.push({ label: name, pass: true });
        }
        if (weights.performance) {
            _score.performance.current += weights.performance;
            _score.performance.log.push({ label: name, pass: true });
        }
    }
    else {
        if (weights.security)
            _score.security.log.push({ label: name, pass: false });
        if (weights.compliance)
            _score.compliance.log.push({ label: name, pass: false });
        if (weights.reliability)
            _score.reliability.log.push({ label: name, pass: false });
        if (weights.performance)
            _score.performance.log.push({ label: name, pass: false });
    }
}
function reset() {
    for (let key in _score) {
        const meta = _score[key];
        meta.current = 0;
        meta.total = 0;
        meta.log = [];
    }
}
///////////////////////////////////////////////////////////////////////////////
function urlIsHttps(url = "") {
    return () => url && url.startsWith("https://");
}
function urlHasNoUsername(url = "") {
    return () => {
        if (!url)
            return true;
        const _url = new URL(url);
        return !_url.username;
    };
}
function urlHasNoPassword(url = "") {
    return () => {
        if (!url)
            return true;
        const _url = new URL(url);
        return !_url.username;
    };
}
async function evaluate() {
    // tokenUrl ---------------------------------------------------------------
    check("tokenUrl uses https", { security: 5, reliability: 3 }, urlIsHttps(config.authentication?.tokenEndpoint));
    check("tokenUrl does not include username", { security: 5, reliability: 5 }, urlHasNoUsername(config.authentication?.tokenEndpoint));
    check("tokenUrl does not include password", { security: 5, reliability: 5 }, urlHasNoPassword(config.authentication?.tokenEndpoint));
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
        check("jwksUrl uses https", { security: 5, reliability: 3 }, urlIsHttps(config.authentication.jwksUrl));
    }
    check("Does not require clients to request write scopes", { compliance: 3, security: 5, reliability: 3 }, () => !(config.authentication?.scope || "").match(/\/.*?\.(write|\*)\b/));
}
async function report() {
    reset();
    await evaluate();
    for (const criteria in _score) {
        const meta = _score[criteria];
        if (meta.total > 0) {
            const pct = Math.floor(meta.current / meta.total * 100);
            console.log(`${criteria}: ${pct}%`.bold + ` (${meta.current}/${meta.total})`.dim);
            if (meta.log.length) {
                meta.log.forEach(entry => {
                    console.log("  " + (entry.pass ? "✔ ".green : "✘ ".red) + entry.label);
                });
            }
        }
    }
}
report();
//# sourceMappingURL=evaluate.js.map