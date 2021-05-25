import { JWK as JoseJWK } from "node-jose";
import { SupportedJWKAlgorithm, AuthTokenHeader, AuthTokenClaims } from "./auth";
export interface AuthenticationOptions {
    /**
     * Can be:
     * - `backend-services` (*default*) all tests will be executed.
     * - `client-credentials` - uses client_id and client_secret. Most of the
     *    authorization tests will be skipped.
     * - `none` - no authorization will be performed and all the authorization
     *    tests will be skipped.
     */
    type: "backend-services" | "client-credentials" | "none";
    /**
     * Set to true if auth if supported but not required
     */
    optional?: boolean;
    /**
     * Required if authType is other than "none"
     */
    clientId?: string;
    /**
     * Required if authType is set to "client-credentials"
     */
    clientSecret?: string;
    /**
     * Not used if authType is set to "none"
     * Defaults to "system/*.read"
     */
    scope?: string;
    /**
     * The full URL of the token endpoint. Required, unless authType is set
     * to "none"
     */
    tokenEndpoint?: string;
    privateKey?: JoseJWK.Key;
    /**
     * Custom values to be merged with the authentication token claims.
     * NOTE that the following cannot be overridden:
     * - `iss` (equals the clientId)
     * - `sub` (equals the clientId)
     * - `aud` (equals the tokenUrl)
     * - `jti` random value generated at runtime
     */
    customTokenClaims?: AuthTokenClaims;
    /**
     * Custom properties to be merged with the authentication token
     * header before signing it.
     * NOTE that the following cannot be overridden:
     * - `typ` (equals "JWT")
     * - `alg` (@see `tokenSignAlgorithm` below)
     * - `kty` (equals the private key `kty`)
     * - `jku` (equals the current `jwks_url` if any)
     */
    customTokenHeaders?: AuthTokenHeader;
    /**
     * The specifications states that:
     * > *The authentication JWT SHALL include the following claims, and
     *   SHALL be signed with the client’s private key (which **SHOULD
     *   be an RS384 or ES384 signature**).*
     *
     * We sign with RS384 by default, but allow more!
     * Acceptable values are: RS256, RS384, RS512, ES256, ES384 and ES512
     */
    tokenSignAlgorithm?: SupportedJWKAlgorithm;
    /**
     * Expressed in seconds or a string describing a time span (Eg: `60`,
     * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
     * a seconds count. If you use a string be sure you provide the time
     * units (days, hours, etc), otherwise milliseconds unit is used by
     * default ("120" is equal to "120ms").
     * If not provided, we will use "5m" as default.
     * @see [zeit/ms](https://github.com/zeit/ms)
     */
    tokenExpiresIn?: string | number;
    jwksUrl?: string;
}
export interface ServerConfig {
    baseURL?: string;
    authentication: AuthenticationOptions;
    requests: {
        strictSSL?: boolean;
        timeout?: number;
        customHeaders: Record<string, any>;
    };
    groupId?: string;
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export").
     */
    systemExportEndpoint?: string;
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export").
     */
    patientExportEndpoint?: string;
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports group-level export. If so, and if `groupId`
     * is set group-level tests will be enabled.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the group export support, you can skip that
     * check by declaring the `groupExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Group/{GroupID}/$export").
     * Note that if you set this, then the `groupId` option will not be used
     * since the `groupId` is already part of the `groupExportEndpoint` path.
     */
    groupExportEndpoint?: string;
    fastestResource?: string;
    supportedResourceTypes?: string[];
}
export interface NormalizedConfig {
    baseURL: string;
    authentication: {
        type: "backend-services" | "client-credentials" | "none";
        optional: boolean;
        clientId?: string;
        clientSecret?: string;
        /**
         * Not used if authType is set to "none"
         * Defaults to "system/*.read"
         */
        scope: string;
        /**
         * The full URL of the token endpoint. Required, unless authType is set
         * to "none"
         */
        tokenEndpoint?: string;
        privateKey?: JoseJWK.Key;
        /**
         * Custom values to be merged with the authentication token claims.
         * NOTE that the following cannot be overridden:
         * - `iss` (equals the clientId)
         * - `sub` (equals the clientId)
         * - `aud` (equals the tokenUrl)
         * - `jti` random value generated at runtime
         */
        customTokenClaims?: Record<string, any>;
        /**
         * Custom properties to be merged with the authentication token
         * header before signing it.
         * NOTE that the following cannot be overridden:
         * - `typ` (equals "JWT")
         * - `alg` (@see `tokenSignAlgorithm` below)
         * - `kty` (equals the private key `kty`)
         * - `jku` (equals the current `jwks_url` if any)
         */
        customTokenHeaders?: Record<string, any>;
        /**
         * The specifications states that:
         * > *The authentication JWT SHALL include the following claims, and
         *   SHALL be signed with the client’s private key (which **SHOULD
         *   be an RS384 or ES384 signature**).*
         *
         * We sign with RS384 by default, but allow other algorithms for
         * servers that are not yet fully compliant
         */
        tokenSignAlgorithm?: SupportedJWKAlgorithm;
        /**
         * Expressed in seconds or a string describing a time span (Eg: `60`,
         * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as
         * a seconds count. If you use a string be sure you provide the time
         * units (days, hours, etc), otherwise milliseconds unit is used by
         * default ("120" is equal to "120ms").
         * If not provided, we will use "5m" as default.
         * @see [zeit/ms](https://github.com/zeit/ms)
         */
        tokenExpiresIn?: string | number;
        jwksUrl?: string;
    };
    requests: {
        strictSSL: boolean;
        customHeaders: Record<string, any>;
        timeout: number;
    };
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports system-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the system export support, you can skip that check
     * by declaring the `systemExportEndpoint` below. The value should be a path
     * relative to the `baseURL` (typically just "$export").
     */
    systemExportEndpoint?: string;
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports patient-level export and at what endpoint.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the patient export support, you can skip that
     * check by declaring the `patientExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Patient/$export").
     */
    patientExportEndpoint?: string;
    /**
     * By default BDT will fetch and parse the CapabilityStatement to try to
     * detect if the server supports group-level export. If so, and if `groupId`
     * is set group-level tests will be enabled.
     * However, if the server does not have a CapabilityStatement or if it is
     * not properly declaring the group export support, you can skip that
     * check by declaring the `groupExportEndpoint` below. The value should be
     * a path relative to the `baseURL` (typically "Group/{GroupID}/$export").
     * Note that if you set this, then the `groupId` option will not be used
     * since the `groupId` is already part of the `groupExportEndpoint` path.
     */
    groupExportEndpoint?: string;
    fastestResource: string;
    supportedResourceTypes: string[];
}
export default class Config {
    private originalConfig;
    private normalizedConfig;
    private _capabilityStatement;
    constructor(originalConfig: ServerConfig);
    normalize(): Promise<NormalizedConfig>;
    private getCapabilityStatement;
    private getTokenEndpoint;
    private getSystemExportEndpoint;
    private getGroupExportEndpoint;
    private getPatientExportEndpoint;
    private getSupportedResourceTypes;
}
