/// <reference types="node" />
import EventEmitter from "events";
import { Config } from "./bdt";
import { Suite } from "./Suite";
import { Test } from "./Test";
export default class TestRunner extends EventEmitter {
    canceled: boolean;
    settings: Config;
    currentGroup: Suite;
    onlyMode: boolean;
    constructor(settings: Config, onlyMode?: boolean);
    endTest(test: Test, context: Record<string, any>, error?: Error): Promise<void>;
    endGroup(node: Suite, parent: Suite, context: Record<string, any>, error?: Error): Promise<void>;
    run(node: Test | Suite, context?: Record<string, any>): Promise<void>;
    runTest(test: Test, context?: Record<string, any>): Promise<void>;
}
