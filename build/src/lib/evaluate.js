"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const careevolution_js_1 = __importDefault(require("../../config-examples/careevolution.js"));
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
async function evaluate() {
    const { tokenEndpoint } = careevolution_js_1.default.authentication || {};
    await check("tokenUrl uses https", { security: 5, reliability: 3 }, () => tokenEndpoint.startsWith("https://"));
    await check("tokenUrl does not include username", { security: 5, reliability: 5 }, () => {
        const url = new URL(tokenEndpoint);
        return url && !url.username;
    });
    await check("tokenUrl does not include password", { security: 5, reliability: 5 }, () => {
        const url = new URL(tokenEndpoint);
        return url && !url.password;
    });
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