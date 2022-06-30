import { bdt } from "../../types";
/**
 * Creates and signs an authentication token. Note that this is the low-level
 * method and everything is customizable. That is perfect for testing, but for
 * real life use it may be better to wrap this in another function that only
 * allows meaningful modifications.
 */
export declare function createAuthToken({ algorithm, privateKey, header, claims, expiresIn, tokenEndpoint, jwksUrl, clientId }: bdt.createAuthTokenOptions): string;
