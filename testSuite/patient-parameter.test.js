const expect   = require("code").expect;
const { BulkDataClient } = require("./lib");


module.exports = function(describe, it, before, after, beforeEach, afterEach) {

    describe({ version: "1.5", name: "Support for the 'patient' parameter" }, () => {

        [
            {
                idPrefix: "Patient-level",
                name    : "Patient-level export",
                type    : "patient"
            },
            {
                idPrefix: "Group-level",
                name    : "Group-level export",
                type    : "group"
            }
        ].forEach((meta, index) => {
            it ({
                id  : `patient-param-${index}`,
                name: `Supports the patient parameter via the ${meta.name} endpoint`,
                description: "Makes a normal export and then tries to make another one limited to the first patient from the result."
            }, async (cfg, api) => {

                const client = new BulkDataClient(cfg, api);

                await client.kickOff({
                    type: meta.type,
                    params: {
                        _type: "Patient"
                    }
                }, "First ");

                const file = await client.downloadFileAt(0);
                await client.cancel();

                const lines = file.body.split(/\r?\n/);

                let patient;
                for (let line of lines) {
                    // skip empty lines
                    if (!line.trim()) {
                        continue;
                    }

                    try {
                        patient = JSON.parse(line);
                        break;
                    } catch (ex) {
                        throw new Error(`Failed to parse Patient line from NDJSON: ${ex.message}`);
                    }
                }

                await client.kickOff({
                    method: "POST",
                    type: meta.type,
                    body: {
                        resourceType: "Parameters",
                        parameter: [
                            {
                                name : "patient",
                                valueReference : { reference: `Patient/${patient.id}` }
                            },
                            {
                                name: "_type",
                                valueString: "Patient"
                            }
                        ]
                    }
                }, "Second ");

                await client.waitForExport();
                const file2 = await client.downloadFile(client.statusResponse.body.output[0].url);
                await client.cancel();
                const lines2 = file2.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                expect(lines2.length, "The file should contain 1 line").to.equal(1);

                let patient2;
                try {
                    patient2 = JSON.parse(lines2[0]);
                } catch (ex) {
                    throw new Error(`Failed to parse Patient line from NDJSON: ${ex.message}`);
                }

                expect(patient2.id, `The patient ID should equal "${patient.id}"`).to.equal(patient.id);
            });
        });

        it ({
            id  : "patient-param-2",
            name: "Rejects system-level export with patient parameter",
            description: "The patient parameter is not applicable to system level export requests. " +
                "This test verifies that such invalid export attempts are being rejected."
        }, async (cfg, api) => {

            const client = new BulkDataClient(cfg, api);

            if (!(await client.getSystemExportEndpoint())) {
                api.setNotSupported(`The system-level export is not supported by this server`);
                return null;
            }

            await client.kickOff({
                method: "POST",
                type: "system",
                body: {
                    resourceType: "Parameters",
                    parameter: [
                        {
                            "name" : "patient",
                            "valueReference" : { reference: "Patient/123" }
                        },
                        {
                            "name" : "patient",
                            "valueReference" : { reference: "Patient/456" }
                        }
                    ]
                }
            });

            await client.cancelIfStarted();

            if (client.kickOffResponse.statusCode === 405) { // Method Not Allowed
                return api.setNotSupported(`system-level export via POST is not supported by this server`);
            }

            if (client.kickOffResponse.statusCode == 404 || client.kickOffResponse.statusCode >= 500) {
                return api.setNotSupported(`It seems that system-level export via POST is not supported by this server`);
            }

            // Finally check that we have got an error response
            client.expectFailedKickOff();
        });
    });
};
