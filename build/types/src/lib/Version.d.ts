export declare class Version {
    private _segments;
    constructor(input: string | number | Version);
    clone(): Version;
    toString(): string;
    toJSON(): string;
    get segments(): number[];
    isBelow(version: Version | string): boolean;
    isBelowOrEqualTo(version: Version | string): boolean;
    isAbove(version: Version | string): boolean;
    isAboveOrEqualTo(version: Version | string): boolean;
    isEqualTo(version: Version | string): boolean;
    /**
     * Compares this version with another one and returns:
     * - `1` if this version is higher
     * - `0` if versions are equal
     * - `-1` if this version is lower
     */
    compare(version: Version | string): number;
}
