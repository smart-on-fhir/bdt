"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suite = void 0;
const source_1 = __importDefault(require("got/dist/source"));
const suite = async function ({ config, check }) {
    await check({
        name: 'The token endpoint rejects "http"',
        description: "The token endpoint should be on https and should reject requests to it made via http.",
        weights: { security: 4, reliability: 4 }
    }, async () => {
        const tokenEndpoint = config.authentication?.tokenEndpoint;
        if (!tokenEndpoint || !tokenEndpoint.startsWith("https://"))
            return false;
        return source_1.default(tokenEndpoint.replace(/^https\:/, "http:"), {
            method: "POST",
            json: {}
        }).then(() => false, () => true);
    });
    await check({
        name: 'The token endpoint requires "application/x-www-form-urlencoded" POST body',
        weights: { security: 4, reliability: 3, compliance: 5 }
    }, async () => {
        const tokenEndpoint = config.authentication?.tokenEndpoint;
        if (!tokenEndpoint)
            return false;
        return source_1.default(tokenEndpoint, {
            method: "POST",
            headers: {
                "content-type": "text/html"
            },
            json: {}
        }).then(() => false, () => true);
    });
};
exports.suite = suite;
//# sourceMappingURL=token-endpoint.js.map