// import { inspect } from "util"
import { Suite } from "../lib/Suite";
import { Test } from "../lib/Test";
import TestRunner from "../lib/TestRunner"



// Every test that takes more than DURATION_MEDIUM will have it's time rendered
const DURATION_MEDIUM = 500;

// Indent with this character or character sequence
const INDENT_STRING = "  ";


interface TestNode {
    name: string
    status?: string
    children?: TestNode[]
    endedAt?: number
    startedAt?: number
    description?: string
    warnings?: string[]
    hookErrors?: Error[]
    error?: Error
}

function icon(node: TestNode) {
    if (node.children)
        return "●";

    if (node.status === "succeeded")
        return "✔";

    if (node.status === "failed")
        return "✘";

    if (node.status === "not-implemented")
        return "⊖";

    if (node.status === "not-supported")
        return "⊗";
    
    if (node.status === "skipped")
        return "⊘";
    
    if (node.status === "warned")
        return "!";

    return " ";
}

function text(node: TestNode) {
    if (node.status === "not-implemented") {
        return node.name + " (not implemented)";
    }
    if (node.status === "not-supported") {
        return node.name + " (not supported)";
    }
    if (node.status === "skipped") {
        return node.name + " (skipped)";
    }
    return node.name;
}

/**
 * Rounds the given number @n using the specified precision.
 * @param n
 * @param [precision]
 */
function roundToPrecision(n: number|string, precision?: number): number {
    n = parseFloat(n + "");

    if ( isNaN(n) || !isFinite(n) ) {
        return NaN;
    }

    if ( !precision || isNaN(precision) || !isFinite(precision) || precision < 1 ) {
        n = Math.round( n );
    }
    else {
        const q = Math.pow(10, precision);
        n = Math.round( n * q ) / q;
    }

    return n;
}

function formatDuration(ms: number) {
    let meta = [
        { label: "week"  , n: 1000 * 60 * 60 * 24 * 7 },
        { label: "day"   , n: 1000 * 60 * 60 * 24     },
        { label: "hour"  , n: 1000 * 60 * 60          },
        { label: "minute", n: 1000 * 60               },
        { label: "second", n: 1000                    }
    ];

    for (let cur of meta) {
        let chunk = ms / cur.n;
        if (chunk > 1) {
            return `${roundToPrecision(chunk, 1)} ${cur.label}${chunk > 1 ? "s" : ""}`;
        }
    }

    return `${ms} ms`;
}

function duration(node: TestNode) {
    const dur   = node.endedAt - node.startedAt;
    if (dur >= DURATION_MEDIUM) {
        return formatDuration(dur);
    }
    return "";
}

function indent(depth = 0) {
    let out = "", i = depth;
    while (i-- > 0) {
        out += INDENT_STRING;
    }
    return out;
}

export default function StdoutReporter(runner: TestRunner)
{
    let depth     = 0;
    let startTime = 0;
    let endTime   = 0;
    
    const counts = {
        succeeded         : 0,
        failed            : 0,
        "not-implemented" : 0,
        "not-supported"   : 0,
        warnings          : 0,
        skipped           : 0,
        total             : 0
    }

    function log(...args: any[]) {
        let prefix = indent(depth)
        console.log(...args.map(arg => prefix + String(arg).split("\n").join("\n" + prefix)))
    }

    function onStart() {
        startTime = Date.now();
    }

    function onTestStart() {
        ++depth;
    }

    function onEnd() {
        endTime = Date.now();
        log(`\n${counts.total} tests executed in ${formatDuration(endTime - startTime)}`);
        log(`     succeeded tests: ${counts.succeeded}`);
        log(`       skipped tests: ${counts.skipped}`);
        log(`        failed tests: ${counts.failed}`);
        log(`     not implemented: ${counts["not-implemented"]}`);
        log(` not supported tests: ${counts["not-supported"]}`);
        log(`  generated warnings: ${counts.warnings}`);
        detach(runner);
    }

    function onGroupStart(node: Suite) {
        ++depth;
        if (!runner.settings.match && node.name !== "__ROOT__") {
            log(`${icon(node)} ${node.name}`);
        }
    }

    function onGroupEnd(node: Suite) {
        --depth;
        logDetails(node);
    }

    function onTestEnd(node: Test) {
        log(`${icon(node)} ${text(node) + " " + duration(node)}`);
        
        // counters
        counts.total += 1;
        if (node.status !== "warned" &&
            node.status !== "running" && 
            node.status !== "unknown" &&
            node.status !== "aborted") {
            counts[node.status] += 1;
        }

        ++depth

        // // Tests with errors or warnings also render the description (if any)
        // if (node.description && (node.error || node.warnings.length)) {
        //     log(node.description);
        // }

        // if (node.status === "failed") {
        //     log(node.error.stack);
        // }

        // if (node.warnings.length) {
        //     counts.warnings += node.warnings.length;
        //     node.warnings.forEach(w => log(`warning: ${w}`));
        // }

        // if (node.log.length) {
        //     node.log.forEach(x => {
        //         const str = (Array.isArray(x) ? x : [x]).map((x: any) => {
        //             return inspect(x, false, 10, true)
        //         }).join(" ");
        //         log(`log: ${str}`);
        //     });
        // }

        // for (const key in node.decorations) {
        //     const entry = node.decorations[key];
        //     if (entry && typeof entry === "object") {
        //         const { __type, ...rest } = node.decorations[key]
        //         log(`${key} ${inspect({ ...rest }, false, 10, false)}`);
        //     } else {
        //         log(`${key} ${entry}`);
        //     }
        // }

        logDetails(node);
        depth -= 2;
    }

    function logDetails(node: TestNode) {
        if (Array.isArray(node.hookErrors) && node.hookErrors.length) {
            node.hookErrors.forEach(err => {
                log(`hook error: ${err.stack}`);
            });
        }
    }

    function attach(runner: TestRunner) {
        runner.on("start"     , onStart     );
        runner.on("groupStart", onGroupStart);
        runner.on("end"       , onEnd       );
        runner.on("groupEnd"  , onGroupEnd  );
        runner.on("testEnd"   , onTestEnd   );
        runner.on("testStart" , onTestStart );
    }

    function detach(runner: TestRunner) {
        runner.off("start"     , onStart     );
        runner.off("groupStart", onGroupStart);
        runner.off("end"       , onEnd       );
        runner.off("groupEnd"  , onGroupEnd  );
        runner.off("testEnd"   , onTestEnd   );
        runner.off("testStart" , onTestStart );
    }

    attach(runner);
}
