import { bdt } from "../../types";
import { TestOptions } from "../lib/Test";

declare global {
    export var suite: {
        (nameOrOptions: string | bdt.TestNodeOptions, fn: () => void): void
        only: (nameOrOptions: string | bdt.TestNodeOptions, fn: () => void) => void
    }
    
    export var test: {
        <Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>): void
        only: <Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>) => void
        skip: <Context=Record<string, any>>(nameOrOptions: string | Omit<TestOptions, "fn">, fn?: bdt.TestCallbackFn<Context>) => void
    }

    export var before    : <Context=Record<string, any>>(fn: bdt.SetupCallbackFn<Context>) => void
    export var after     : <Context=Record<string, any>>(fn: bdt.SetupCallbackFn<Context>) => void
    export var beforeEach: <Context=Record<string, any>>(fn: bdt.TestCallbackFn<Context> ) => void
    export var afterEach : <Context=Record<string, any>>(fn: bdt.TestCallbackFn<Context> ) => void
}