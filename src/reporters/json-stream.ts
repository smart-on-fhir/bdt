import TestRunner from "../lib/TestRunner"

interface IndexSignature {
    [key: string]: any
}

export default function createJSReporter(runner: TestRunner)
{
    function logEvent(type: string, data?: IndexSignature, whitelist?: string[]) {
        try {
            console.log(JSON.stringify({
                type,
                data
            }, whitelist));
        } catch (ex) {
            console.error(ex);
        }
    }
    
    function onStart() {
        logEvent("start");
    }
    
    function onEnd() {
        logEvent("end");
        detach(runner);
    }
    
    function onGroupStart(data: IndexSignature) {
        logEvent("groupStart", data, [
            "type",
            "data",
            "name",
            "id",
            "path",
            "minVersion",
            "maxVersion",
            "description"
        ]);
    }
    
    function onGroupEnd(data: IndexSignature) {
        logEvent("groupEnd", data, [
            "type",
            "data",
            "name",
            "id",
            "path",
            "minVersion",
            "maxVersion",
            "description"
        ]);
    }
    
    function onTestStart(data: IndexSignature) {
        logEvent("testStart", data);
    }
    
    function onTestEnd(data: IndexSignature) {
        logEvent("testEnd", data);
    }

    function attach(runner: TestRunner) {
        runner.on("start"     , onStart     );
        runner.on("groupStart", onGroupStart);
        runner.on("end"       , onEnd       );
        runner.on("groupEnd"  , onGroupEnd  );
        runner.on("testStart" , onTestStart );
        runner.on("testEnd"   , onTestEnd   );
    }

    function detach(runner: TestRunner) {
        runner.off("start"     , onStart     );
        runner.off("groupStart", onGroupStart);
        runner.off("end"       , onEnd       );
        runner.off("groupEnd"  , onGroupEnd  );
        runner.off("testStart" , onTestStart );
        runner.off("testEnd"   , onTestEnd   );
    }
    
    attach(runner);
}
