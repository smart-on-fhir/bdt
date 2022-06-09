import "colors";
import { NormalizedConfig } from "../Config";
import { Config as ConfigType } from "../bdt";
declare type weight = 1 | 2 | 3 | 4 | 5;
interface WeightDescriptor {
    weight: weight;
    description?: string;
}
declare type Weights = {
    security?: weight | WeightDescriptor;
    compliance?: weight | WeightDescriptor;
    reliability?: weight | WeightDescriptor;
    performance?: weight | WeightDescriptor;
};
export declare type suiteFunction = (ctx: {
    config: NormalizedConfig;
    check: (options: checkOptions, fn: () => any) => Promise<void>;
}) => any;
interface checkOptions {
    name: string;
    weights: Weights;
    minVersion?: string;
    maxVersion?: string;
    description?: string;
}
declare function report(options: ConfigType, destination: string, openFile?: boolean): Promise<void>;
export default report;
