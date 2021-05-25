import TestRunner from "../lib/TestRunner"

interface IndexSignature {
    [key: string]: any
}

interface RunnerEvent {
    type: string
    data?: IndexSignature
}

export default function createJSReporter(output: RunnerEvent[])
{

    function logEvent(event: RunnerEvent) {
        output.push(event);
    }
    
    function onStart() {
        logEvent({ type: "start" });
    }
    
    function onEnd() {
        logEvent({ type: "end" });
    }
    
    function onGroupStart(data: IndexSignature) {
        logEvent({ type: "groupStart", data });
    }
    
    function onGroupEnd(data: IndexSignature) {
        logEvent({ type: "groupEnd", data });
    }
    
    function onTestStart(data: IndexSignature) {
        logEvent({ type: "testStart", data });
    }
    
    function onTestEnd(data: IndexSignature) {
        logEvent({ type: "testEnd", data });
    }

    function attach(runner: TestRunner) {
        runner.on("start"     , onStart     );
        runner.on("groupStart", onGroupStart);
        runner.on("end"       , onEnd       );
        runner.on("groupEnd"  , onGroupEnd  );
        runner.on("testStart" , onTestStart );
        runner.on("testEnd"   , onTestEnd   );
        runner.once("end", () => detach(runner) );
    }

    function detach(runner: TestRunner) {
        runner.off("start"     , onStart     );
        runner.off("groupStart", onGroupStart);
        runner.off("end"       , onEnd       );
        runner.off("groupEnd"  , onGroupEnd  );
        runner.off("testStart" , onTestStart );
        runner.off("testEnd"   , onTestEnd   );
    }
    
    return { attach, detach };
}
