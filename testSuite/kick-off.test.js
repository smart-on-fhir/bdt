const expect = require("code").expect;
const URL    = require("url").URL;
const {
    request,
    authorize,
    logRequest,
    logResponse
} = require("./lib");

const exportTypes = [
    {
        name: "Patient-level export",
        mountPoint :`/Patient/`
    },
    {
        name: "System-level export",
        mountPoint :`/`
    },
    {
        name       : "Group-level export",
        mountPoint :`/Group/{group-id}/`
    }
]

class Export {

    constructor(options, decorations, uri)
    {
        this.options = options;
        this.decorations = decorations;
        this.url = new URL(uri);

        this.requestHeaders = {
            accept: "application/fhir+json",
            prefer: "respond-async"
        };
    }

    async authorize()
    {
        const accessToken = await authorize(this.options);
        this.requestHeaders.authorization = "Bearer " + accessToken;
        return this;
    }

    async send() {
        await this.authorize();
        const req = request({
            uri: this.url.href,
            json: true,
            strictSSL: this.options.strictSSL,
            headers: this.requestHeaders
        });

        logRequest(this.decorations, req);
        const { response } = await req.promise();
        this.response = response;
        logResponse(this.decorations, response);
    }

    cancel()
    {
        return request({
            uri      : this.response.headers["content-location"],
            method   : "DELETE",
            strictSSL: this.options.strictSSL
        }).promise();
    }

    expect400()
    {
        expect(this.response.statusCode, "response.statusCode").to.equal(400);
        expect(this.response.statusMessage, "response.statusMessage").to.equal("Bad Request");
        expect(this.response.body.resourceType, "In case of error the server should return an OperationOutcome").to.equal("OperationOutcome");
    }

    async expectSuccessAndCancel()
    {
        expect(this.response.statusCode, "response.statusCode").to.equal(202);
        await this.cancel();
        if (this.response.body) {
            expect(this.response.body.resourceType).to.equal("OperationOutcome");
        }
    }
}


module.exports = function(describe, it) {
    exportTypes.forEach(meta => {
        describe(meta.name, () => {

            it ({
                name: "Requires Accept header",
                description: 'The Accept header specifies the format of the optional OperationOutcome response ' +
                    'to the kick-off request. Currently, only <code>application/fhir+json</code> is supported.'
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export`);
                delete exp.requestHeaders.accept;
                await exp.send();
                exp.expect400();
            });

            it ({
                name: "Requires Prefer header to equal respond-async",
                description: 'The <b>Prefer</b> request header is required and specifies ' +
                            'whether the response is immediate or asynchronous. ' +
                            'The header MUST be set to <b>respond-async</b>. ' +
                            '<a href="https://github.com/smart-on-fhir/fhir-bulk-data-docs/blob/master/export.md#headers" target="_blank">Red More</a>'
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export`);
                delete exp.requestHeaders.prefer;
                await exp.send();
                exp.expect400();
            });

            ([
                "application/fhir+ndjson",
                "application/ndjson",
                "ndjson"
            ].forEach(type => {
                it ({
                    name: `Accepts _outputFormat=${type}`,
                    description: `Verifies that the server accepts <code>${type}</code> as <b>_outputFormat</b> parameter`
                }, async (cfg, decorations) => {
                    const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export`);
                    exp.url.searchParams.set("_outputFormat", type);
                    await exp.send();
                    await exp.expectSuccessAndCancel();
                });
            }));

            ([
                "application/xml",
                "text/html",
                "x-custom"
            ].forEach(type => {
                it ({
                    name: `Rejects unsupported format "_outputFormat=${type}"`,
                    description: `This tests if the server rejects <code>_outputFormat=${type}</code> ` +
                        `parameter, even though <code>${type}</code> is valid mime type.`
                }, async (cfg, decorations) => {
                    const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export`);
                    exp.url.searchParams.set("_outputFormat", type);
                    await exp.send();
                    exp.expect400();
                });
            }));

            it ({
                name: "Rejects _since={invalid date} parameter",
                description: "The server should reject exports if the <code>_since</code> parameter is not a valid date"
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export?_since=0000-60-01`);
                await exp.send();
                exp.expect400();
            });

            it ({
                name: "Rejects _since={future date} parameter",
                description: "The server should reject exports if the <code>_since</code> parameter is a date in the future"
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export?_since=2057-01-01`);
                await exp.send();
                exp.expect400();
            });

            it ({
                name: "Validates the _type parameter",
                description: "Verifies that the request is rejected if the <code>_type</code> " +
                    "contains invalid resource type"
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export?_type=MissingType`);
                await exp.send();
                exp.expect400();
            });

            it ({
                name: "Accepts the _typeFilter parameter",
                description: "The <code>_typeFilter</code> parameter is optional so the servers " +
                    "should not reject it, even if they don't support it"
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export`);
                exp.url.searchParams.set("_type", "Patient");
                exp.url.searchParams.set("_typeFilter", "Patient?status=active");
                await exp.send();
                await exp.expectSuccessAndCancel();
            });

            it ({
                name: "Response - Success",
                description: "Verifies that the server starts an export if called with valid parameters. " +
                    "The status code must be <code>202 Accepted</code> and a <code>Content-Location</code> " +
                    "header must be returned. The response body should be either empty, or a JSON OperationOutcome."
            }, async (cfg, decorations) => {
                const exp = new Export(cfg, decorations, `${cfg.baseURL}${meta.mountPoint}$export?_type=Patient`);
                await exp.send();
                await exp.expectSuccessAndCancel();
            });
        });
    });
};
