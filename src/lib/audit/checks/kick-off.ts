import got, { OptionsOfUnknownResponseBody, Response } from "got/dist/source"
import { merge } from "../lib"
import validator from "validator"
import { suiteFunction } from ".."
import { BulkData, BulkDataClient, exportType, KickOfOptions } from "../../BulkDataClient"
import { TestAPI } from "../../TestAPI"
import { Test } from "../../Test"
import { NotSupportedError } from "../../errors"
import { wait } from "../../lib"

const baseOptions: OptionsOfUnknownResponseBody = {}

async function requiresHeader(name: string) {
    return rejectsHeader(name, undefined)
}

async function rejectsHeader(name: string, value: string) {
    return isClientError(await got(merge(baseOptions, { headers: { [name]: value }})))
}

async function rejects(options: Partial<OptionsOfUnknownResponseBody>) {
    return isClientError(await got(merge(baseOptions, options)))
}

async function isClientError(res: Response) {
    return res.statusCode >= 400 && res.statusCode < 500
}

async function req(options: Record<string, any>) {
    return await got(merge(baseOptions, options))
}

async function kickOff(options: Record<string, any>) {
    return await got(merge(baseOptions, options))
}

export const suite: suiteFunction = async function({ config, check }) {

    const client = new BulkDataClient(config, new TestAPI(new Test({ name: "" })))

    
    // BEGIN FEATURE DETECTION ------------------------------------------------

    const exportTypesGET: exportType[] = [];

    const exportTypesPOST: exportType[] = [];

    const exportTypes: exportType[] = ["system", "patient", "group"];

    const methods: ("GET"|"POST")[] = ["GET", "POST"];

    check({
        name: `Supports system-level export`,
        weights: { reliability: 3 }
    }, () => {
        if (config.systemExportEndpoint) {
            exportTypesGET.push("system")
            return true
        }
        return false
    })

    check({
        name: `Supports patient-level export`,
        weights: { reliability: 3 }
    }, () => {
        if (config.patientExportEndpoint) {
            exportTypesGET.push("patient")
            return true
        }
        return false
    })

    check({
        name: `Supports group-level export`,
        weights: { reliability: 3 }
    }, () => {
        if (config.groupExportEndpoint) {
            exportTypesGET.push("group")
            return true
        }
        return false
    })

    await check({
        name: `Supports system-level export using POST requests`,
        minVersion: "2",
        weights: { reliability: 3, compliance: 5 }
    }, async () => {
        if (config.systemExportEndpoint) {
            const { response } = await client.kickOff({ type: "system", params: { _type: config.fastestResource }})
            await client.cancelIfStarted(response)
            if (response.statusCode === 202) {
                exportTypesPOST.push("system")
                return true
            }
        }
        return false
    })

    await check({
        name: `Supports patient-level export using POST requests`,
        minVersion: "2",
        weights: { reliability: 3, compliance: 5 }
    }, async () => {
        if (config.patientExportEndpoint) {
            const { response } = await client.kickOff({ type: "patient", params: { _type: config.fastestResource }})
            await client.cancelIfStarted(response)
            if (response.statusCode === 202) {
                exportTypesPOST.push("patient")
                return true
            }
        }
        return false
    })

    await check({
        name: `Supports group-level export using POST requests`,
        minVersion: "2",
        weights: { reliability: 3, compliance: 5 }
    }, async () => {
        if (config.groupExportEndpoint) {
            const { response } = await client.kickOff({ type: "group", params: { _type: config.fastestResource }})
            await client.cancelIfStarted(response)
            if (response.statusCode === 202) {
                exportTypesPOST.push("group")
                return true
            }
        }
        return false
    })

    // END FEATURE DETECTION --------------------------------------------------

    for (const type of exportTypes) {
        for (const method of methods) {

            // headers --------------------------------------------------------

            await check({
                name: `${type}-level ${method} kick-off requires "accept" header`,
                description: "The 'accept' request header is required and servers should return an error if it is not sent",
                weights: { security: 1, reliability: 4, compliance : 5 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, headers: { accept: undefined } })
                await client.cancelIfStarted(response)
                return response.statusCode >= 400 && response.statusCode < 500
            })

            await check({
                name: `${type}-level ${method} kick-off requires the "prefer" header to contain respond-async`,
                description: "The 'prefer' request header must contain 'respond-async' and servers should verify that",
                weights: { security: 1, reliability: 4, compliance: 5 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, headers: { prefer: "test-header-value" }})
                await client.cancelIfStarted(response)
                return response.statusCode >= 400 && response.statusCode < 500
            })

            await check({
                name: `${type}-level ${method} kick-off allows the "prefer" header to contain "respond-async,handling=lenient"`,
                description: "Clients should be able to send 'handling=lenient' in the prefer header. That would increase the reliability and compliance score.",
                weights: { reliability: 4, compliance: 5 },
                minVersion: "2"
            }, async () => {
                const { response } = await client.kickOff({ type, method, headers: { prefer: ["respond-async", "handling=lenient"] }})
                await client.cancelIfStarted(response)
                return response.statusCode === 202
            })

            // _outputFormat ------------------------------------------------------

            await check({
                name: `${type}-level ${method} kick-off accepts "_outputFormat=application/fhir+ndjson"`,
                description: "Even servers that use custom output formats must support the default format 'application/fhir+ndjson'.",
                weights: { reliability: 4, compliance: 4 },
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _outputFormat: "application/fhir+ndjson" }})
                await client.cancelIfStarted(response)
                return response.statusCode === 202
            })
        
            await check({
                name: `${type}-level ${method} kick-off accepts "_outputFormat=application/ndjson"`,
                description: "Even servers that use custom output formats must support the default format 'application/ndjson'.",
                weights: { reliability: 4, compliance: 4 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _outputFormat: "application/ndjson" }})
                await client.cancelIfStarted(response)
                return response.statusCode === 202
            })
        
            await check({
                name: `${type}-level ${method} kick-off accepts "_outputFormat=ndjson"`,
                description: "Even servers that use custom output formats must support the default format 'ndjson'.",
                weights: { reliability: 4, compliance: 4 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _outputFormat: "ndjson" }})
                await client.cancelIfStarted(response)
                return response.statusCode === 202
            })

            await check({
                name: `${type}-level ${method} kick-off rejects irrelevant output formats like _outputFormat=text/html"`,
                description: "Servers should reject irrelevant output formats like _outputFormat=text/html instead of silently ignoring them.",
                weights: { reliability: 3, compliance: 4 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _outputFormat: "text/html" }})
                await client.cancelIfStarted(response)
                return response.statusCode >= 400 && response.statusCode < 500
            })

            // _since -------------------------------------------------------------

            await check({
                name: `${type}-level ${method} kick-off rejects the "_since" parameter if it contains invalid date`,
                description: "Invalid '_since' should be rejected by the server, rather than being silently ignored.",
                weights: { compliance: 3, reliability: 5, security: 3 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _since: "0000-60-01T30:70:80+05:00" }})
                await client.cancelIfStarted(response)
                return response.statusCode >= 400 && response.statusCode < 500
            })

            await check({
                name: `${type}-level ${method} kick-off rejects the "_since" parameter if it contains a future date`,
                description: "Invalid '_since' should be rejected by the server, rather than being silently ignored.",
                weights: { compliance: 1, reliability: 5, security: 3 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _since: "2057-01-01T00:00:00+05:00" }})
                await client.cancelIfStarted(response)
                return response.statusCode >= 400 && response.statusCode < 500
            });

            // _type --------------------------------------------------------------
            
            await check({
                name: `${type}-level ${method} kick-off rejects invalid "_type" parameter`,
                description: "Verifies that the request is rejected if the `_type` contains invalid resource type",
                weights: { reliability: 5, security: 5 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { _type: "MissingType" }});
                await client.cancelIfStarted(response)
                return response.statusCode >= 400 && response.statusCode < 500
            });

            await check({
                minVersion: "1.2",
                name: `${type}-level ${method} kick-off accepts multiple "_type" parameters`,
                description: "Clients can use multiple `_type` parameters instead of single comma-separated lists",
                weights: { reliability: 5, compliance: 5 }
            }, async () => {
                const types = config.supportedResourceTypes;
                if (types.length < 2) return false;
                const { response } = await client.kickOff({ type, method, params: { _type: types.slice(0, 2) }});
                await client.cancelIfStarted(response)
                return response.statusCode === 202
            });

            // includeAssociatedData ------------------------------------------

            await check({
                name: `${type}-level ${method} kick-off accepts the includeAssociatedData parameter`,
                minVersion: "1.2",
                description: "When provided, servers with support for the parameter and " +
                    "requested values SHALL return or omit a pre-defined set of FHIR " +
                    "resources associated with the request. The `includeAssociatedData` " +
                    "parameter is optional so the servers can ignore it or reply with an error.",
                weights: { reliability: 3, compliance: 3 }
            }, async () => {
                const { response } = await client.kickOff({ type, method, params: { includeAssociatedData: "LatestProvenanceResources" }});
                await client.cancelIfStarted(response);
                return response.statusCode === 202                
            });

            await check({
                name: `${type}-level ${method} kick-off accepts multiple includeAssociatedData values as comma separated list`,
                minVersion: "1.2",
                description: "When provided, servers with support for the parameter and " +
                    "requested values SHALL return or omit a pre-defined set of FHIR " +
                    "resources associated with the request. The `includeAssociatedData` " +
                    "parameter is optional so the servers can ignore it or reply with an error.",
                    weights: { reliability: 3, compliance: 3 }
            }, async () => {
                const { response } = await client.kickOff({
                    type,
                    params: {
                        includeAssociatedData: "LatestProvenanceResources,RelevantProvenanceResources"
                    }
                });
                await client.cancelIfStarted(response);
                return response.statusCode === 202
            });

            await check({
                name: `${type}-level ${method} kick-off accepts multiple includeAssociatedData parameters`,
                minVersion: "1.2",
                description: "When provided, servers with support for the parameter and " +
                    "requested values SHALL return or omit a pre-defined set of FHIR " +
                    "resources associated with the request. The `includeAssociatedData` " +
                    "parameter is optional so the servers can ignore it or reply with an error. " +
                    "Either way, servers should not reply with a server error (statusCode >= 500), " +
                    "even if they don't support it.",
                weights: { reliability: 3, compliance: 3 }
            }, async () => {
                const { response } = await client.kickOff({
                    type,
                    params: {
                        includeAssociatedData: [
                            "LatestProvenanceResources",
                            "RelevantProvenanceResources"
                        ]
                    }
                });
                await client.cancelIfStarted(response);
                return response.statusCode === 202
            });

            // _elements -------------------------------------------------------
            await check({
                name: `${type}-level ${method} kick-off accepts the "_elements" parameter`,
                description: "Verifies that the server starts an export if called with valid _elements parameter",
                weights: { compliance: 3, reliability: 3 }
            }, async () => {
                const resourceType = config.fastestResource || "Patient";
                const { response } = await client.kickOff({
                    method,
                    type,
                    params: {
                        _elements: `id,${resourceType}.meta`,
                        _type: resourceType
                    }
                });
                return response.statusCode == 202
            });

            await check({
                name: `${type}-level ${method} kick-off accepts multiple "_elements" parameters`,
                description: "Verifies that the server starts an export if called with valid _elements parameters",
                weights: { compliance: 3, reliability: 3 }
            }, async () => {
                const resourceType = config.fastestResource || "Patient";
                const { response } = await client.kickOff({
                    method,
                    type,
                    params: {
                        _elements: ["id", `${resourceType}.meta`],
                        _type: resourceType
                    }
                });
                return response.statusCode == 202
            });

            // patient ---------------------------------------------------------
            if (method === "POST") {
                if (type !== "system") {
                    await check({
                        name: `${type}-level ${method} kick-off supports the "patient" parameter`,
                        description: "Makes a normal export and then tries to make another one limited to the first patient from the result.",
                        weights: { compliance: 3, reliability: 3 }
                    }, async () => {

                        let kickOffResponse1, kickOffResponse2;
                        try {

                            kickOffResponse1 = (await client.kickOff({
                                type,
                                params: {
                                    _type: "Patient"
                                }
                            })).response;

                            const manifest = await client.getExportManifest(kickOffResponse1)
                            const fileUrl = manifest.output[0].url
                            const file = await client.downloadFile(fileUrl)
                            await client.cancel(kickOffResponse1);
                            const line1 = file.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0];
                            let patient = JSON.parse(line1);
        
                            kickOffResponse2 = (await client.kickOff({
                                method: "POST",
                                type,
                                params: {
                                    patient: [ patient.id ],
                                    _type: "Patient"
                                }
                            })).response;

                            {
                                const manifest = await client.getExportManifest(kickOffResponse2)
                                const fileUrl = manifest.output[0].url
                                const file = await client.downloadFile(fileUrl)
                                await client.cancel(kickOffResponse2);
                                const lines = file.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                            
                                if (lines.length !== 1) {
                                    return false
                                }

                                return JSON.parse(lines[0]).id === patient.id
                            }
                        } catch (error) {
                            if (kickOffResponse2) {
                                await client.cancel(kickOffResponse2);
                            }
                            if (kickOffResponse1) {
                                await client.cancel(kickOffResponse1);
                            }
                            throw error 
                        }
                    });
                } else {
                    await check({
                        name: `${type}-level ${method} kick-off rejects export with patient parameter`,
                        description: "The patient parameter is not applicable to system level export requests. " +
                            "This test verifies that such invalid export attempts are being rejected.",
                        weights: { compliance: 3, reliability: 3 }
                    }, async () => {
            
                        const { response } = await client.kickOff({
                            method: "POST",
                            type: "system",
                            params: {
                                patient: [ "123", "456" ]
                            }
                        });
            
                        await client.cancelIfStarted(response);
            
                        if (
                            response.statusCode === 405 || // Method Not Allowed
                            response.statusCode === 404 || // Perhaps not implemented
                            response.statusCode === 501    // Not Implemented
                        ) { 
                            return false
                        }

                        return response.statusCode >= 400 && response.statusCode < 500
                    });
                }
            }
        }
    }
}
