"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createJSReporter(runner) {
    function logEvent(type, data, whitelist) {
        try {
            console.log(JSON.stringify({
                type,
                data
            }, whitelist));
        }
        catch (ex) {
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
    function onGroupStart(data) {
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
    function onGroupEnd(data) {
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
    function onTestStart(data) {
        logEvent("testStart", data);
    }
    function onTestEnd(data) {
        logEvent("testEnd", data);
    }
    function attach(runner) {
        runner.on("start", onStart);
        runner.on("groupStart", onGroupStart);
        runner.on("end", onEnd);
        runner.on("groupEnd", onGroupEnd);
        runner.on("testStart", onTestStart);
        runner.on("testEnd", onTestEnd);
    }
    function detach(runner) {
        runner.off("start", onStart);
        runner.off("groupStart", onGroupStart);
        runner.off("end", onEnd);
        runner.off("groupEnd", onGroupEnd);
        runner.off("testStart", onTestStart);
        runner.off("testEnd", onTestEnd);
    }
    attach(runner);
}
exports.default = createJSReporter;
//# sourceMappingURL=json-stream.js.map