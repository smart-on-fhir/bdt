import { bdt } from "../../types";
export default class Config {
    private originalConfig;
    private _capabilityStatement;
    constructor(originalConfig: bdt.ServerConfig);
    normalize(signal?: AbortSignal): Promise<bdt.NormalizedConfig>;
    private getCapabilityStatement;
    private getOperationDefinition;
    private getTokenEndpoint;
    private getSystemExportEndpoint;
    private getPatientExportEndpoint;
    private getSupportedResourceTypes;
    static validate(cfg: Partial<bdt.ServerConfig>, signal?: AbortSignal): Promise<void>;
}
