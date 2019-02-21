require("colors");

// Every test that takes more than DURATION_MEDIUM (but less then DURATION_SLOW)
// will have it's time rendered in yellow
const DURATION_MEDIUM = 500;

// Every test that takes more than DURATION_SLOW will have it's time rendered in 
// red
const DURATION_SLOW = 1000;

// Indent with this character or character sequence
const INDENT_STRING = "  ";

const log = console.log;

function icon(node) {
    if (node.type == "group")
        return "⏺".grey;

    if (node.status == "succeeded")
        return "✔".green;

    if (node.status == "failed")
        return "✘".red;

    if (node.status == "waiting")
        return "⏳".blue;

    if (node.status == "not-implemented")
        return "⛔".grey;

    return " ";
}

function text(node) {
    if (node.status == "not-implemented") {
        return node.name.grey;
    }
    return node.name;
}

function getColorForDuration(duration) {
    if (duration >= DURATION_SLOW) {
        return "red";
    }

    if (duration > DURATION_MEDIUM) {
        return "yellow";
    }

    return "green";
}

function formatDuration(ms) {
    let out = [];
    let meta = [
        { label: "week"  , n: 1000 * 60 * 60 * 24 * 7 },
        { label: "day"   , n: 1000 * 60 * 60 * 24     },
        { label: "hour"  , n: 1000 * 60 * 60          },
        { label: "minute", n: 1000 * 60               },
        { label: "second", n: 1000                    },
        { label: "m"     , n: 1                       }
    ];

    meta.reduce((prev, cur, i, all) => {
        let chunk = Math.floor(prev / cur.n);
        if (chunk) {
            out.push(`${chunk} ${cur.label}${chunk > 1 ? "s" : ""}`);
            return prev - chunk * cur.n
        }
        return prev
    }, ms);

    if (!out.length) {
        out.push(`0 ${meta.pop().label}s`);
    }

    if (out.length > 1) {
        let last = out.pop();
        out[out.length - 1] += " and " + last;
    }

    return out.join(", ")
}

function duration(node) {
    const dur   = node.endedAt - node.startedAt;
    const color = getColorForDuration(dur);
    return `(${formatDuration(dur)})`[color];
}

function indent(depth = 0) {
    let out = "", i = depth;
    while (i-- > 0) {
        out += INDENT_STRING;
    }
    return out;
}

function parseHTML(html) {
    return html.replace(/<(\w+)>(.*?)<\/\1>/gi, (match, tagName, contents) => {
        switch (tagName.toLowerCase()) {
            case "b": return contents.bold;
            case "i": return contents.italic;
            case "a": return contents.blue;
            case "code": return contents.bold;
        }
        return contents;
    })
}

module.exports = function StdoutReporter()
{
    let depth = 0;

    function onStart() {
        log("");
    }

    function onEnd() {
        log("");
    }

    function onGroupStart(node) {
        if (node.name !== "__ROOT__") {
            log(`${indent(depth++)} ${icon(node)} ${node.name.bold}`);
        }
    }

    function onGroupEnd() {
        --depth;
    }

    function onTestEnd(node) {
        log(`${indent(depth)} ${icon(node)} ${text(node)} ${duration(node)}`);
        if (node.status == "failed") {
            if (node.description) {
                log(`${indent(depth + 1)} ${"├─".grey} ${parseHTML(node.description)}`);    
            }
            log(`${indent(depth + 1)} ${"└⮞".grey} ${node.error.message.red}`);
        }
    }

    return {
        attach(runner)
        {
            runner.on("start"     , onStart     );
            runner.on("groupStart", onGroupStart);
            runner.on("end"       , onEnd       );
            runner.on("groupEnd"  , onGroupEnd  );
            runner.on("testEnd"   , onTestEnd   );
        },

        detach(runner)
        {
            runner.off("start"     , onStart     );
            runner.off("groupStart", onGroupStart);
            runner.off("end"       , onEnd       );
            runner.off("groupEnd"  , onGroupEnd  );
            runner.off("testEnd"   , onTestEnd   );
        }
    };
}
