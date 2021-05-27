import colors, { Color } from "colors"
import { inspect } from "util"
import markdownIt from "markdown-it"
import Token from "markdown-it/lib/token";
import { Suite } from "../lib/Suite";
import { Test } from "../lib/Test";
import TestRunner from "../lib/TestRunner"
import { ConsoleEntry, LogType } from "../lib/Console";
import { StdOutReporterOptions } from "../lib/bdt";
import { count as assertionsCount } from "@hapi/code"
import { roundToPrecision } from "../lib/lib";

const md = markdownIt();


// Every test that takes more than DURATION_MEDIUM (but less then DURATION_SLOW)
// will have it's time rendered in yellow
const DURATION_MEDIUM = 500;

// Every test that takes more than DURATION_SLOW will have it's time rendered in 
// red
const DURATION_SLOW = 1000;

// Indent with this character or character sequence
const INDENT_STRING = "   ";

const log = console.log;

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
    only?: boolean
}

function clearLine() {
    process.stdout.write("\u001b[2K\r");
}

function icon(node: TestNode) {
    if (node.children)
        return "📦".grey.bold;// 🮥

    if (node.status === "succeeded")
        return "✔".green;

    if (node.status === "failed")
        return "✘".red.bold;

    if (node.status === "not-implemented")
        return "⊖".grey.bold;

    if (node.status === "not-supported")
        return "⊗".grey.bold;
    
    if (node.status === "skipped")
        return "⊘".grey.bold;
    
    if (node.status === "warned")
        return "!".yellow.bold;

    return " ";
}

function getColorForDuration(duration: number) {
    if (duration >= DURATION_SLOW) {
        return "red";
    }

    if (duration >= DURATION_MEDIUM) {
        return "yellow";
    }

    return "green";
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

function wrap(str: string, linePrefix = "", maxLen = 80) {

    if (!maxLen || maxLen < 0) {
        return str
    }

    maxLen -= linePrefix.length

    let pos = 0
    let out = []
    let len = str.length

    let currentLine = ""
    let currentLineLength = 0

    while (pos < len)
    {
        let char = str[pos++]

        if (char === "\u001b") {
            currentLine += char;
            do {
                char = str[pos++]
                currentLine += char;
            } while (char !== "m");
        }
        else if (char === "\n") {
            out.push(currentLine)
            currentLine = ""
            currentLineLength = 0
        }
        else {
            currentLine += char;
            currentLineLength += 1;
        }

        if (currentLineLength >= maxLen) {
            out.push(currentLine)
            currentLine = ""
            currentLineLength = 0
        }
    }

    if (currentLine) {
        out.push(currentLine)
    }

    return out.join("\n" + linePrefix);
}

function parseMD(markdown: string, defaultStyle: Color = colors.dim) {

    function render(tokens: Token[], context: { linkHref?: string, linkText?: string } = {}) {
        let out = "";
        let olCounter = 0;
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
                            out += defaultStyle(token.content);
                        }
                        break;
                    case "code_inline":
                        out += colors.bold(token.content);
                        break;
                    case "strong_open":
                        out += colors.enabled ? '\u001b[1m' : "";
                        break;
                    case "strong_close":
                        out += colors.enabled ? '\u001b[22m' : "";
                        break;
                    case "em_open":
                        out += colors.enabled ? '\u001b[3m' : "";
                        break;
                    case "em_close":
                        out += colors.enabled ? '\u001b[23m' : "";
                        break;
                    case "paragraph_open":
                    case "paragraph_close":
                    case "bullet_list_close":
                    case "bullet_list_open":
                    case "list_item_close":
                        break;
                    case "list_item_open":
                        out += "\n" + (olCounter ? `${olCounter++}.` : defaultStyle("•")) + ' ';
                        break;
                    case "link_open":
                        const href = token.attrs.find(a => a[0] == "href");
                        if (href) {
                            context.linkHref = href[1];
                        }
                        break;
                    case "link_close":
                        if (context.linkText && context.linkText === context.linkHref) {
                            out += colors.cyan(context.linkText);
                        }
                        else {
                            if (context.linkText) {
                                out += context.linkText;
                            }
                            if (context.linkHref && context.linkHref !== context.linkText) {
                                out += context.linkText ? ": " : "";
                                out += colors.cyan(context.linkHref);
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
                        out += `\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`.dim;
                        out += colors.italic(token.content);
                        out += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`.dim;
                        break;
                    case "softbreak":
                        out += "\n";
                        break;
                    case "ordered_list_open":
                        olCounter = 1;
                        break;
                    case "ordered_list_close":
                        olCounter = 0;
                        out += `\n`;
                        break;
                    case "hr":
                        out += `══════════════════════════════════════════════════\n`;
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

    return render(md.parse(markdown, {}));
}

function consoleEntryLabel(entry: ConsoleEntry) {
    switch (entry.type) {
        case "info":
            return entry.label.cyan.dim.bold
        case "warn":
            return entry.label.yellow.bold
        case "error":
            return entry.label.red.bold
        case "log":
            return entry.label.blue.bold
        default:
            return (entry.label + ":").magenta.dim.bold
    }
}

function getColorForLogType(type: LogType) {
    switch (type) {
        case "error":
            return colors.red
        case "warn":
            return colors.yellow
        case "info":
            return colors.cyan
        default:
            return colors.reset
    }
}

export default function StdoutReporter(runner: TestRunner, options: StdOutReporterOptions)
{
    let depth     = 0;
    let startTime = 0;
    let endTime   = 0;
    let currentGroup: Suite;
    let isInOnlyMode: boolean;
    
    const counts = {
        succeeded         : 0,
        failed            : 0,
        "not-implemented" : 0,
        "not-supported"   : 0,
        warnings          : 0,
        skipped           : 0,
        total             : 0
    }

    let timer: NodeJS.Timeout;

    options = {
        wrap: 80,
        colors: true,
        verbose: "auto",
        ...options
    };

    if (!options.colors) {
        colors.disable()
    }

    function text(node: TestNode) {
        if (node.status === "not-implemented") {
            return node.name.grey + " (not implemented)".grey.dim;
        }
        if (node.status === "not-supported") {
            return node.name.grey + " (not supported)".yellow.dim;
        }
        if (node.status === "skipped") {
            return node.name.grey + (
                isInOnlyMode && !node.only ?
                " (skipped due to only mode)" :
                " (skipped)"
            ).grey.dim.italic;
        }
        return node.name;
    }

    function logConsoleEntry(entry: ConsoleEntry, verbose?: boolean)
    {
        if (entry.tags.indexOf("request") >= 0 && !verbose)
            return
        if (entry.tags.indexOf("response") >= 0 && !verbose)
            return

        const currentIndent = indent(depth)
        const nextIndent = indent(depth + 1)

        log(`${currentIndent}${wrap(
            consoleEntryLabel(entry) + " " + entry.data.map(x => {
                let color = getColorForLogType(entry.type)

                if (entry.type === "warn") {
                    counts.warnings++
                }
                if (typeof x === "string") {
                    if (entry.tags.indexOf("markdown") >= 0) {
                        return parseMD(x, color)
                    }
                    return color(x);
                }
                if (entry.tags.indexOf("request") >= 0) {
                    return verbose ?
                        inspect(x, false, 4, colors.enabled) :
                        `${x.method} ${x.url}${x.body ? " (with payload)".dim : ""}`
                }
                if (entry.tags.indexOf("response") >= 0) {
                    return verbose ?
                        inspect(x, false, 4, colors.enabled) :
                        `${x.statusCode} ${x.statusMessage}${x.body ? " (with payload)".dim : ""}`
                }
                if (entry.type === "error") {
                    return x.message.replace(/^(\w+)?Error:\s*/, "").red
                    // verbose ?
                    //     inspect(x, false, 4, colors.enabled) :
                        // x.message.replace(/^(\w+)?Error:\s*/, "").red
                }
                return inspect(x, false, 4, colors.enabled)
            }).join(" "),
            nextIndent,
            options.wrap
        )}`)
    }
    
    function onStart({ onlyMode }: { onlyMode: boolean }) {
        startTime = Date.now();
        isInOnlyMode = onlyMode
        log("");
    }

    function onEnd() {
        endTime = Date.now();
        log(`\n${counts.total} tests executed in ${formatDuration(endTime - startTime)}`.bold);
        log(`     succeeded tests: ${counts.succeeded}`);
        log(`       skipped tests: ${counts.skipped}`);
        log(`        failed tests: ${counts.failed}`);
        log(`     not implemented: ${counts["not-implemented"]}`);
        log(` not supported tests: ${counts["not-supported"]}`);
        log(`  generated warnings: ${counts.warnings}`);
        log(`          assertions: ${assertionsCount()}`);
        detach(runner);
    }

    function onGroupStart(node: Suite) {
        currentGroup = node
        if (!runner.settings.match && node.name !== "__ROOT__") {
            let prefix = indent(depth++)
            log(`${prefix} ${icon(node)} ${wrap(
                // @ts-ignore
                node.name.bold,
                prefix,
                options.wrap
            )}`);
        }
    }

    function onGroupEnd(node: Suite) {
        --depth;
        logDetails(node);
    }

    function onTestStart(node: Test) {
        if (node.status === "skipped" && options.verbose !== "always") return
        // const chars = ["○", "◔", "◑", "◕", "●"];
        const chars = "○○○○◓◑◒◐○○○○".split("");// ◒◐◓
        // const chars = "  ▏▎▍▌▋▊▋▌▍▎▏".split(""); //
        // const chars = " ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁ ".split("");
        // const chars = "🌕🌔🌓🌒🌑🌘🌗🌖".split("");⦾⦿
        let prefix = indent(depth)
        function write(i = 0) {
            clearLine();
            process.stdout.write(`${prefix} ${chars[i].yellow} ${text(node)} ${duration(node)}`);
            timer = setTimeout(() => write(++i % chars.length), 150)
        }
        write()
    }

    function onTestEnd(node: Test) {
        clearTimeout(timer)
        clearLine()

        // if (node.status === "skipped" && !currentGroup.only && options.verbose !== "always") return
        if (node.status === "skipped" && options.verbose !== "always") return

        const verbose = options.verbose === "always" || (
            options.verbose === "auto" && node.status === "failed"
        );

        const currentIndent = indent(depth)
        const nextIndent = indent(depth + 1)

        log(`${currentIndent} ${
            wrap(
                icon(node) + " " + text(node) + " " + duration(node),
                nextIndent,
                options.wrap
        )}`);
        
        // counters
        counts.total += 1;
        counts[node.status] += 1;

        depth++

        // Tests with errors or warnings also render the description (if any)
        if (node.description && (node.status == "failed" || node.error || node.console.byTags(["warning", "error"]).length)) {
            log(`${nextIndent}${wrap(
                parseMD(node.description).dim,
                nextIndent,
                options.wrap
            )}`);
        }

        node.console.forEach(entry => logConsoleEntry(entry, verbose))

        logDetails(node);
        depth--
    }

    function logDetails(node: TestNode) {
        if (Array.isArray(node.hookErrors) && node.hookErrors.length) {
            let prefix = indent(depth + 1)
            node.hookErrors.forEach(err => {
                log(`${prefix} ${wrap(
                    " hook error ".red + " " + err.stack.red,
                    prefix,
                    options.wrap
                )}`);
            });
        }
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
