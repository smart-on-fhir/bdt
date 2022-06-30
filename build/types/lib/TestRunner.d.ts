/// <reference types="node" />
import EventEmitter from "events";
import { Suite } from "./Suite";
import { Test } from "./Test";
import { TestAPI } from "./TestAPI";
import { bdt } from "../../types";
export default class TestRunner extends EventEmitter {
    canceled: boolean;
    settings: bdt.BDTOptions;
    currentGroup: Suite;
    currentTestApi: TestAPI;
    onlyMode: boolean;
    context: Record<string, any>;
    startPath: string | null;
    constructor(settings: bdt.BDTOptions, onlyMode?: boolean, context?: {});
    endTest(test: Test, context: Record<string, any>, error?: Error): Promise<void>;
    endGroup(node: Suite, parent: Suite, context: Record<string, any>, error?: Error): Promise<void>;
    run(node: Test | Suite, context?: Record<string, any>): Promise<void>;
    _run(node: Test | Suite, context?: Record<string, any>): Promise<void>;
    runTest(test: Test, context?: Record<string, any>): Promise<void>;
    abort(aportAll?: boolean): void;
}
