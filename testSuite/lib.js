const request  = require("request");
const crypto   = require("crypto");
const jwt      = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");


/**
 * A wrapper for the request function. Returns the request object that you can
 * either pipe to, or use `request(options).promise().then().catch()
 * @param {Object|String} options
 */
function customRequest(options)
{
    /**
     * @type {*}
     */
    let req = {};

    const promise = new Promise((resolve, reject) => {

        if (typeof options == "string") {
            options = { url: options };
        }

        // options.json = true;

        try {
            req = request(options, (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                resolve({ response, body, request: req });
            });
        }
        catch (error) {
            reject(error);
        }
    });

    req.promise = () => promise;

    return req;
}

function createClientAssertion(claims = {}, signOptions = {}, privateKey)
{
    let jwtToken = {
        // iss: "leap-client-id",
        // sub: "leap-client-id",
        exp: Date.now() / 1000 + 300, // 5 min
        jti: crypto.randomBytes(32).toString("hex"),
        ...claims
    };

    const _signOptions = {
        algorithm: privateKey.alg,
        keyid: privateKey.kid,
        ...signOptions,
        header: {
            // jku: jwks_url || undefined,
            kty: privateKey.kty,
            ...signOptions.header
        }
    };

    return jwt.sign(jwtToken, jwkToPem(privateKey, { private: true }), _signOptions);
}

async function authorize({ tokenEndpoint, clientId, privateKey, strictSSL })
{
    const { response } = await customRequest({
        method   : "POST",
        uri      : tokenEndpoint,
        json     : true,
        strictSSL: !!strictSSL,
        form     : {
            scope                : "system/*.read",
            grant_type           : "client_credentials",
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion     : createClientAssertion({
                aud: tokenEndpoint,
                iss: clientId,
                sub: clientId
            }, {}, privateKey)
        }
    }).promise();

    return response.body.access_token;
}

function logRequest(obj, req, label = "Request")
{
    // obj.Request = `${req.method} ${req.uri.href}\n\n`
    // obj.Request += Object.keys(req.headers).map(h => {
    //     if (h === "authorization") {
    //         return `${h}: ${req.headers[h].replace(
    //             /^\s*(Bearer)\s+.*$/i,
    //             "$1 ⏺⏺⏺⏺⏺⏺"
    //         )}`;
    //     }
    //     return `${h}: ${req.headers[h]}`;
    // }).join("\n");
    obj[label] = {
        __type: "request",
        method: req.method,
        url   : req.uri.href,
        headers: {
            ...req.headers
        },
        body: req.body || undefined
    };
    return obj;
}

function logResponse(obj, res, label = "Response")
{
    obj[label] = {
        __type: "response",
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers,
        body: res.body
    };
    return obj;
}

function wait(ms)
{
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}

module.exports = {
    request: customRequest,
    createClientAssertion,
    authorize,
    logRequest,
    logResponse,
    wait
};
