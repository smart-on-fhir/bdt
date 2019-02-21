/**
 * If Node.js is spawned with an IPC channel, the process.send() method can be
 * used to send messages to the parent process. Messages will be received as a
 * 'message' event on the parent's ChildProcess object.
 * If Node.js was not spawned with an IPC channel, process.send() will be
 * undefined.
 */

function onStart() {
    process.send({ eventSource: "bdt", type: "start" });
}

function onEnd() {
    process.send({ eventSource: "bdt", type: "end" });
}

function onGroupStart(node) {
    process.send({ eventSource: "bdt", type: "groupStart", node });
}

function onGroupEnd(node) {
    process.send({ eventSource: "bdt", type: "groupEnd", node });
}

function onTestEnd(node) {
    process.send({ eventSource: "bdt", type: "testEnd", node });
}

function onTestStart(node) {
    process.send({ eventSource: "bdt", type: "testStart", node });
}

module.exports = function IPCReporter()
{
    return {
        attach(runner)
        {
            if (typeof process.send === "function") {
                runner.on("start"     , onStart     );
                runner.on("groupStart", onGroupStart);
                runner.on("end"       , onEnd       );
                runner.on("groupEnd"  , onGroupEnd  );
                runner.on("testStart" , onTestStart );
                runner.on("testEnd"   , onTestEnd   );
            }
        },

        detach(runner)
        {
            if (typeof process.send === "function") {
                runner.off("start"     , onStart     );
                runner.off("groupStart", onGroupStart);
                runner.off("end"       , onEnd       );
                runner.off("groupEnd"  , onGroupEnd  );
                runner.off("testStart" , onTestStart );
                runner.off("testEnd"   , onTestEnd   );
            }
        }
    };
}
