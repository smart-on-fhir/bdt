import TestRunner from "../lib/TestRunner";
interface IndexSignature {
    [key: string]: any;
}
interface RunnerEvent {
    type: string;
    data?: IndexSignature;
}
export default function createJSReporter(output: RunnerEvent[]): {
    attach: (runner: TestRunner) => void;
    detach: (runner: TestRunner) => void;
};
export {};
