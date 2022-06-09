export class Version
{
    private _segments: number[];

    constructor(input: string | number | Version)
    {
        if (input instanceof Version) {
            return input.clone();
        }

        const segments: number[] = String(input).trim().split(/\s*\.\s*/).map(x => parseInt(x, 10));

        segments.forEach(x => {
            if (isNaN(x) || !isFinite(x) || x < 0) {
                throw new TypeError(`Invalid version "${input}"`);
            }
        });

        this._segments = segments;
    }

    clone()
    {
        return new Version(this.toString())
    }

    toString()
    {
        return this._segments.join(".")
    }

    toJSON()
    {
        return this.toString()
    }

    get segments(): number[]
    {
        return [ ...this._segments ]
    }

    isBelow(version: Version | string): boolean
    {
        return this.compare(version) < 0;
    }

    isBelowOrEqualTo(version: Version | string): boolean
    {
        return this.compare(version) <= 0;
    }
    
    isAbove(version: Version | string): boolean
    {
        return this.compare(version) > 0;
    }
    
    isAboveOrEqualTo(version: Version | string): boolean
    {
        return this.compare(version) >= 0;
    }
    
    isEqualTo(version: Version | string): boolean
    {
        return this.compare(version) === 0;
    }

    /**
     * Compares this version with another one and returns:
     * - `1` if this version is higher
     * - `0` if versions are equal
     * - `-1` if this version is lower
     */
    compare(version: Version | string): number
    {
        if (typeof version === "string") {
            version = new Version(version);
        }

        let a = this.segments;
        let b = version.segments;

        for (let i = 0; i < a.length && i < b.length; i++) {
            if (a[i] > b[i]) {
                return 1
            }
            if (a[i] < b[i]) {
                return -1
            }
        }

        return 0;
    }
}
