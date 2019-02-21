const expect = require("code").expect;
const URL    = require("url").URL;
const moment = require("moment");
const {
    request,
    authorize,
    logRequest,
    logResponse,
    wait
} = require("./lib");

class Export {

    constructor(options, decorations, uri)
    {
        this.options         = options;
        this.decorations     = decorations;
        this.url             = new URL(uri);
        this.kickOffRequest  = null;
        this.kickOffResponse = null;
        this.statusRequest   = null;
        this.statusResponse  = null;
        this.cancelRequest   = null;
        this.cancelResponse  = null;
        this.accessToken     = null;

        this.requestHeaders = {
            accept: "application/fhir+json",
            prefer: "respond-async"
        };
    }

    async getAccessToken()
    {
        if (!this.accessToken) {
            this.accessToken = await authorize(this.options);
        }
        return this.accessToken;
    }

    async kickOff()
    {
        const accessToken = await this.getAccessToken();
        this.kickOffRequest = request({
            uri: this.url.href,
            json: true,
            strictSSL: this.options.strictSSL,
            headers: {
                accept: "application/fhir+json",
                prefer: "respond-async",
                authorization: "Bearer " + accessToken
            }
        });

        logRequest(this.decorations, this.kickOffRequest, "Kick-off Request");
        const { response } = await this.kickOffRequest.promise();
        this.kickOffResponse = response;
        logResponse(this.decorations, this.kickOffResponse, "Kick-off Response");
    }

    async status()
    {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to check status but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to check status but the kick-off response did not include a content-location header"
            );
        }

        this.statusRequest = request({
            uri      : this.kickOffResponse.headers["content-location"],
            json     : true,
            strictSSL: this.options.strictSSL,
            headers: {
                authorization: this.kickOffRequest.headers.authorization
            }
        });

        logRequest(this.decorations, this.statusRequest, "Status Request");
        const { response } = await this.statusRequest.promise();
        this.statusResponse = response;
        logResponse(this.decorations, this.statusResponse, "Status Response");
    }

    async waitForExport(suffix = 1) {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to wait for export but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to wait for export but the kick-off response did not include a content-location header"
            );
        }

        this.statusRequest = request({
            uri      : this.kickOffResponse.headers["content-location"],
            json     : true,
            strictSSL: this.options.strictSSL,
            headers: {
                authorization: this.kickOffRequest.headers.authorization
            }
        });

        if (suffix === 1) {
            logRequest(this.decorations, this.statusRequest, "Status Request");
        }
        const { response } = await this.statusRequest.promise();
        this.statusResponse = response;
        logResponse(this.decorations, this.statusResponse, "Status Response " + suffix);
        if (response.statusCode === 202) {
            await wait(5000);
            return this.waitForExport(suffix + 1);
        }
    }

    async cancel()
    {
        if (!this.kickOffResponse) {
            throw new Error(
                "Trying to cancel but there was no kick-off response"
            );
        }

        if (!this.kickOffResponse.headers["content-location"]) {
            throw new Error(
                "Trying to cancel but the kick-off response did not include a content-location header"
            );
        }

        this.cancelRequest = request({
            uri      : this.kickOffResponse.headers["content-location"],
            method   : "DELETE",
            json     : true,
            strictSSL: this.options.strictSSL,
            headers: {
                authorization: this.kickOffRequest.headers.authorization
            }
        });

        logRequest(this.decorations, this.cancelRequest, "Cancellation Request");
        const { response } = await this.cancelRequest.promise();
        this.cancelResponse = response;
        logResponse(this.decorations, this.cancelResponse, "Cancellation Response");
    }

    async send() {
        await this.authorize();
        const req = request({
            uri: this.url.href,
            json: true,
            strictSSL: this.options.strictSSL,
            headers: this.requestHeaders
        });

        logRequest(this.decorations, req, "Kick-off Request");
        const { response } = await req.promise();
        this.response = response;
        logResponse(this.decorations, response, "Kick-off Response");
    }

    // async getStatus() {
    //     const req = request({
    //         uri: this.url.href,
    //         json: true,
    //         strictSSL: this.options.strictSSL,
    //         headers: this.requestHeaders
    //     });

    //     logRequest(this.decorations, req, "Kick-off Request");
    // }

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

    describe("Status Endpoint", () => {

        it ({
            name: "Responds with 202 for active transaction IDs",
            description: "The status endpoint should return 202 status code until the export is completed"
        }, async (cfg, decorations) => {

            const client = new Export(cfg, decorations, `${cfg.baseURL}/Patient/$export?_type=Patient`);
            client.url.searchParams.set(cfg.sinceParam || "_since", moment().subtract(1, "months").format("YYYY-MM-DD"));

            await client.kickOff();
            await client.status();
            await client.cancel();
            expect(client.statusResponse.statusCode).to.equal(202);
        });

        it ({
            name: "Responds with 200 for completed transactions",
            description: "The status endpoint should return 200 status code when the export is completed"
        }, async (cfg, decorations) => {

            const client = new Export(cfg, decorations, `${cfg.baseURL}/Patient/$export?_type=Patient`);
            client.url.searchParams.set(cfg.sinceParam || "_since", moment().subtract(1, "months").format("YYYY-MM-DD"));

            await client.kickOff();
            await client.waitForExport();
            await client.cancel();
            expect(client.statusResponse.statusCode).to.equal(200);
        });

        it ("responds with JSON")
        // , async () => {
        //     const kickOff = await startExport("/$export?_type=Account");
        //     const contentLocation = kickOff.headers["content-location"];
        //     await waitForExport(contentLocation);
        //     const trxId = contentLocation.split("/").pop();
        //     const res = await requestPromise("/bulkstatus/" + trxId);
        //     await cancelExport(trxId);
        //     expectJsonResponse(res);
        // });

        it ("the response contains 'transactionTime'")
        // , async () => {
        //     const kickOff = await startExport("/$export?_type=Account");
        //     const contentLocation = kickOff.headers["content-location"];
        //     const res = await waitForExport(contentLocation);
        //     const trxId = contentLocation.split("/").pop();
        //     await cancelExport(trxId);
        //     // transactionTime - a FHIR instant type that indicates the server's
        //     // time when the query is run. The response SHOULD NOT include any
        //     // resources modified after this instant, and SHALL include any
        //     // matching resources modified up to (and including) this instant.
        //     // Note: to properly meet these constraints, a FHIR Server might
        //     // need to wait for any pending transactions to resolve in its
        //     // database, before starting the export process.
        //     // expect(res.statusCode).to.equal(200);
        //     expect(res).to.have.property("transactionTime");
        //     expect(res.transactionTime).to.be.a("string");
        //     expect(res.transactionTime).to.match(
        //         /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}\.\d{4,}([+-]\d{2}:\d{2}|Z)?$/
        //         // /-?[0-9]{4}(-(0[1-9]|1[0-2])(-(0[0-9]|[1-2][0-9]|3[0-1]))?)?/
        //     );
        // });

        it ("the response contains 'request'")
        // , async () => {
        //     const kickOff = await startExport("/$export?_type=Account");
        //     const contentLocation = kickOff.headers["content-location"];
        //     const res = await waitForExport(contentLocation);
        //     const trxId = contentLocation.split("/").pop();
        //     await cancelExport(trxId);
        //     // the full URI of the original bulk data kick-off request
        //     expect(res.request).to.equal(
        //         `http://127.0.0.1:${bulkDataPort}/$export?_type=Account`
        //     );
        // });

        it ("the response contains 'requiresAccessToken'")
        // , async () => {
        //     const kickOff = await startExport("/$export?_type=Account");
        //     const contentLocation = kickOff.headers["content-location"];
        //     const res = await waitForExport(contentLocation);
        //     const trxId = contentLocation.split("/").pop();
        //     await cancelExport(trxId);
        //     expect(res).to.have.property("requiresAccessToken");
        //     expect(res.requiresAccessToken).to.be.a("boolean");
        // });

        it ("the response contains 'output[]'")
        // , async () => {
        //     const kickOff = await startExport("/$export?_type=Account");
        //     const contentLocation = kickOff.headers["content-location"];
        //     const res = await waitForExport(contentLocation);
        //     const trxId = contentLocation.split("/").pop();
        //     await cancelExport(trxId);
        //     // array of bulk data file items with one entry for each generated
        //     // file. Note: If no resources are returned from the kick-off
        //     // request, the server SHOULD return an empty array.
        //     expect(res).to.have.property("output");
        //     expect(res.output).to.be.an("array");
        //     expect(res.output.length).to.be.greaterThan(0);
        //     expect(res.output[0]).to.have.property("type");
        //     expect(res.output[0]).to.have.property("url");
        //     expect(res.output[0]).to.have.property("count");
        //     expect(res.output[0].type).to.equal("Account");
        //     expect(res.output[0].count).to.equal(10);
        //     expect(res.output[0].url).to.match(/\?limit=\d+&offset=\d+$/);
        // });

        it ("the response contains 'error[]'")
        // , async () => {
        //     const kickOff = await startExport("/$export?_type=Account");
        //     const contentLocation = kickOff.headers["content-location"];
        //     const res = await waitForExport(contentLocation);
        //     const trxId = contentLocation.split("/").pop();
        //     await cancelExport(trxId);
        //     // array of error file items following the same structure as the
        //     // output array. Note: If no errors occurred, the server SHOULD
        //     // return an empty array. Note: Only the OperationOutcome resource
        //     // type is currently supported, so a server MUST generate files in
        //     // the same format as the bulk data output files that contain
        //     // OperationOutcome resources.
        //     expect(res).to.have.property("error");
        //     expect(res.error).to.be.an("array");
        // });

    });

};
