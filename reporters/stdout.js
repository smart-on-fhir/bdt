require("colors");

const sax = require("sax");
const md  = require("markdown-it")();


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
    if (node.type === "group")
        return "●".grey;

    if (node.status === "succeeded")
        return "✔".green;

    if (node.status === "failed")
        return "✘".red;

    if (node.status === "waiting")
        return "◔".blue;

    if (node.status === "not-implemented")
        return "⛔".grey;

    if (node.status === "not-supported")
        return "✘".grey;
    
    if (node.status === "warned")
        return "!".yellow.bold;

    return " ";
}

function text(node) {
    if (node.status === "not-implemented") {
        return node.name.grey.bold;
    }
    if (node.status === "not-supported") {
        return node.name.grey.bold;
    }
    return node.name.bold;
}

function getColorForDuration(duration) {
    if (duration >= DURATION_SLOW) {
        return "red";
    }

    if (duration >= DURATION_MEDIUM) {
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
    if (dur >= DURATION_MEDIUM) {
        const color = getColorForDuration(dur);
        return `(${formatDuration(dur)})`[color];
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

function wrap(str, linePrefix = "", maxLen = 80) {
    const lines = [];
    const max = maxLen - linePrefix.length;
    const words = str.split(/\s+/);
    let line = words.shift();

    while (words.length) {
        const word = words.shift();
        if (line.length + word.length + 1 <= max) {
            line += " " + word;
        } else {
            lines.push(line);
            line = word;
        }
    }

    if (line) {
        lines.push(line)  
    }

    return lines.join("\n" + linePrefix);
}

function parseHTML(html, linePrefix = "\t") {

    function render(tokens, context = {}) {
        let out = "";
        for (const token of tokens) {
            if (token.children) {
                out += render(token.children);
            }
            else {
                // console.log(token.type)
                switch (token.type) {
                    case "text":
                        if (context.linkHref) {
                            context.linkText = token.content;
                        } else {
                            out += wrap(token.content, linePrefix);
                        }
                        break;
                    case "code_inline":
                        out += '\u001b[1m' + wrap(token.content, linePrefix) + '\u001b[22m';
                        break;
                    case "strong_open":
                        out += '\u001b[1m';
                        break;
                    case "strong_close":
                        out += '\u001b[22m';
                        break;
                    case "em_open":
                        out += '\u001b[3m';
                        break;
                    case "em_close":
                        out += '\u001b[23m';
                        break;
                    case "paragraph_open":
                    case "paragraph_close":
                    case "bullet_list_close":
                    case "bullet_list_open":
                    case "list_item_close":
                        break;
                    case "list_item_open":
                        out += "\n" + linePrefix + '- ';
                        break;
                    case "link_open":
                        // console.log(token)
                        const href = token.attrs.find(a => a[0] == "href");
                        if (href) {
                            context.linkHref = href[1];
                            // out += href[1];
                        }
                        break;
                    case "link_close":
                        if (context.linkText && context.linkText === context.linkHref) {
                            out += '\u001b[34m' + wrap(context.linkText, linePrefix) + '\u001b[39m';
                        }
                        else {
                            if (context.linkText) {
                                out += wrap(context.linkText, linePrefix);
                            }
                            if (context.linkHref && context.linkHref !== context.linkText) {
                                out += context.linkText ? ": " : "";
                                out += '\u001b[34m';
                                out += context.linkHref;
                                out += '\u001b[39m';
                            }
                        }
                        if (context.linkText) {
                            delete context.linkText;
                        }
                        if (context.linkHref) {
                            delete context.linkHref;
                        }
                        break;
                    case "fence":
                        out += "\n" + linePrefix + token.content.split("\n").join("\n" + linePrefix);
                        break;
                    case "softbreak":
                        out += "\n" + linePrefix;
                        break;
                    default:
                        console.log(`Unknown token type ${token.type}`);
                        out += token.content;
                        break;
                }
            }
        }
        return out;
    }

    return render(md.parse(html));
}

module.exports = function StdoutReporter()
{
    let depth = 0;

    let startTime = 0;
    let endTime   = 0;
    let count     = 0;
    
    let successful     = 0;
    let failed         = 0;
    let notImplemented = 0;
    let notSupported   = 0;
    let warnings       = 0;

    function onStart() {
        startTime = Date.now();
        log("");
    }

    function onEnd() {
        endTime = Date.now();
        log(`\n${count} tests executed in ${formatDuration(endTime - startTime)}`.bold);
        log(`     succeeded tests: ${successful}`);
        log(`        failed tests: ${failed}`);
        log(`     not implemented: ${notImplemented}`);
        log(` not supported tests: ${notSupported}`);
        log(`  generated warnings: ${warnings}`);
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
        count += 1;
        log(`${indent(depth)} ${icon(node)} ${text(node)} ${duration(node)}`);
        if (node.status === "failed") {
            failed += 1;
            if (node.description) {
                log(`${indent(depth + 1)} ${"├─".grey} ${
                    parseHTML(node.description, `${indent(depth + 1)} ${"│ ".grey} `)
                }`);    
            }
            log(`${indent(depth + 1)} ${"└⯈".grey} ${node.error.message.red}`);
        }
        else if (node.status === "warned") {
            if (node.warnings.length) {
                const len = node.warnings.length;
                warnings += len;
                if (node.description) {
                    log(`${indent(depth + 1)} ${"├─".grey} ${
                        parseHTML(node.description, `${indent(depth + 1)} ${"│ ".grey} `)
                    }`);    
                }
                node.warnings.forEach((w, i) => {
                    log(`${indent(depth + 1)} ${(i === len - 1 ? "└⯈" : "├⯈").grey} ${w.yellow}`);
                });
            }
        }
        else {
            if (node.status === "not-implemented") {
                notImplemented += 1;
            }
            else {
                if (node.status === "not-supported") {
                    notSupported += 1;
                    log(`${indent(depth + 1)} ${"└─".grey} ${node.warnings[0].grey}`);
                }
                else {
                    successful += 1;
                }
            }
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
