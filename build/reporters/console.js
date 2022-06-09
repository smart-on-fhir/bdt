"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = __importDefault(require("colors"));
const util_1 = require("util");
const markdown_it_1 = __importDefault(require("markdown-it"));
const code_1 = require("@hapi/code");
const lib_1 = require("../lib/lib");
const md = markdown_it_1.default();
// Every test that takes more than DURATION_MEDIUM (but less then DURATION_SLOW)
// will have it's time rendered in yellow
const DURATION_MEDIUM = 500;
// Every test that takes more than DURATION_SLOW will have it's time rendered in 
// red
const DURATION_SLOW = 1000;
// Indent with this character or character sequence
const INDENT_STRING = "   ";
const log = console.log;
function clearLine() {
    process.stdout.write("\u001b[2K\r");
}
function icon(node) {
    if (node.children)
        return "📦".grey.bold; // 🮥
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
    let meta = [
        { label: "week", n: 1000 * 60 * 60 * 24 * 7 },
        { label: "day", n: 1000 * 60 * 60 * 24 },
        { label: "hour", n: 1000 * 60 * 60 },
        { label: "minute", n: 1000 * 60 },
        { label: "second", n: 1000 }
    ];
    for (let cur of meta) {
        let chunk = ms / cur.n;
        if (chunk > 1) {
            return `${lib_1.roundToPrecision(chunk, 1)} ${cur.label}${chunk > 1 ? "s" : ""}`;
        }
    }
    return `${ms} ms`;
}
function duration(node) {
    const dur = node.endedAt - node.startedAt;
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
    if (!maxLen || maxLen < 0) {
        return str;
    }
    maxLen -= linePrefix.length;
    let pos = 0;
    let out = [];
    let len = str.length;
    let currentLine = "";
    let currentLineLength = 0;
    while (pos < len) {
        let char = str[pos++];
        if (char === "\u001b") {
            currentLine += char;
            do {
                char = str[pos++];
                currentLine += char;
            } while (char !== "m");
        }
        else if (char === "\n") {
            out.push(currentLine);
            currentLine = "";
            currentLineLength = 0;
        }
        else {
            currentLine += char;
            currentLineLength += 1;
        }
        if (currentLineLength >= maxLen) {
            out.push(currentLine);
            currentLine = "";
            currentLineLength = 0;
        }
    }
    if (currentLine) {
        out.push(currentLine);
    }
    return out.join("\n" + linePrefix);
}
function parseMD(markdown, defaultStyle = colors_1.default.dim) {
    function render(tokens, context = {}) {
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
                        }
                        else {
                            out += defaultStyle(token.content);
                        }
                        break;
                    case "code_inline":
                        out += colors_1.default.bold(token.content);
                        break;
                    case "strong_open":
                        out += colors_1.default.enabled ? '\u001b[1m' : "";
                        break;
                    case "strong_close":
                        out += colors_1.default.enabled ? '\u001b[22m' : "";
                        break;
                    case "em_open":
                        out += colors_1.default.enabled ? '\u001b[3m' : "";
                        break;
                    case "em_close":
                        out += colors_1.default.enabled ? '\u001b[23m' : "";
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
                            out += colors_1.default.cyan(context.linkText);
                        }
                        else {
                            if (context.linkText) {
                                out += context.linkText;
                            }
                            if (context.linkHref && context.linkHref !== context.linkText) {
                                out += context.linkText ? ": " : "";
                                out += colors_1.default.cyan(context.linkHref);
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
                        out += colors_1.default.italic(token.content);
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
function consoleEntryLabel(entry) {
    switch (entry.type) {
        case "info":
            return entry.label.cyan.dim.bold;
        case "warn":
            return entry.label.yellow.bold;
        case "error":
            return entry.label.red.bold;
        case "log":
            return entry.label.blue.bold;
        default:
            return (entry.label + ":").magenta.dim.bold;
    }
}
function getColorForLogType(type) {
    switch (type) {
        case "error":
            return colors_1.default.red;
        case "warn":
            return colors_1.default.yellow;
        case "info":
            return colors_1.default.cyan;
        default:
            return colors_1.default.reset;
    }
}
function StdoutReporter(runner, options) {
    let depth = 0;
    let startTime = 0;
    let endTime = 0;
    let currentGroup;
    let isInOnlyMode;
    const counts = {
        succeeded: 0,
        failed: 0,
        "not-implemented": 0,
        "not-supported": 0,
        warnings: 0,
        skipped: 0,
        total: 0
    };
    let timer;
    options = {
        wrap: 80,
        colors: true,
        verbose: "auto",
        ...options
    };
    if (!options.colors) {
        colors_1.default.disable();
    }
    function text(node) {
        let name = node.name;
        let info = "path: " + node.path;
        if (node.status === "not-implemented") {
            name = name.grey;
            info += ", not implemented".grey;
        }
        else if (node.status === "not-supported") {
            name = name.grey;
            info += ", not supported".yellow;
        }
        else if (node.status === "skipped") {
            name = name.grey;
            info += (isInOnlyMode && !node.only ?
                ", skipped due to only mode" :
                ", skipped").grey.italic;
        }
        return name + (" (" + info + ")").dim;
    }
    function logConsoleEntry(entry, verbose) {
        if (entry.tags.indexOf("request") >= 0 && !verbose)
            return;
        if (entry.tags.indexOf("response") >= 0 && !verbose)
            return;
        const currentIndent = indent(depth);
        const nextIndent = indent(depth + 1);
        log(`${currentIndent}${wrap(consoleEntryLabel(entry) + " " + entry.data.map(x => {
            let color = getColorForLogType(entry.type);
            if (entry.type === "warn") {
                counts.warnings++;
            }
            if (typeof x === "string") {
                if (entry.tags.indexOf("markdown") >= 0) {
                    return parseMD(x, color);
                }
                return color(x);
            }
            if (entry.tags.indexOf("request") >= 0) {
                return verbose ?
                    util_1.inspect(x, false, 4, colors_1.default.enabled) :
                    `${x.method} ${x.url}${x.body ? " (with payload)".dim : ""}`;
            }
            if (entry.tags.indexOf("response") >= 0) {
                return verbose ?
                    util_1.inspect(x, false, 4, colors_1.default.enabled) :
                    `${x.statusCode} ${x.statusMessage}${x.body ? " (with payload)".dim : ""}`;
            }
            if (entry.type === "error") {
                return x.message.replace(/^(\w+)?Error:\s*/, "").red;
                // verbose ?
                //     inspect(x, false, 4, colors.enabled) :
                // x.message.replace(/^(\w+)?Error:\s*/, "").red
            }
            return util_1.inspect(x, false, 4, colors_1.default.enabled);
        }).join(" "), nextIndent, options.wrap)}`);
    }
    function onStart({ onlyMode }) {
        startTime = Date.now();
        isInOnlyMode = onlyMode;
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
        log(`          assertions: ${code_1.count()}`);
        detach(runner);
    }
    function onGroupStart(node) {
        currentGroup = node;
        if (!runner.settings.match && node.name !== "__ROOT__") {
            let prefix = indent(depth++);
            log(`${prefix} ${icon(node)} ${wrap(
            // @ts-ignore
            node.name.bold + ` (path: ${node.path})`.dim, prefix, options.wrap)}`);
        }
    }
    function onGroupEnd(node) {
        --depth;
        logDetails(node);
    }
    function onTestStart(node) {
        if (node.status === "skipped" && options.verbose !== "always")
            return;
        // const chars = ["○", "◔", "◑", "◕", "●"];
        const chars = "○○◓◑◒◐○○".split(""); // ◒◐◓
        // const chars = "  ▏▎▍▌▋▊▋▌▍▎▏".split(""); //
        // const chars = " ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁ ".split("");
        // const chars = "🌕🌔🌓🌒🌑🌘🌗🌖".split("");⦾⦿
        let prefix = indent(depth);
        function write(i = 0) {
            clearLine();
            process.stdout.write(`${prefix} ${chars[i].yellow} ${text(node)} ${duration(node)}`);
            timer = setTimeout(() => write(++i % chars.length), 150);
        }
        write();
    }
    function onTestEnd(node) {
        clearTimeout(timer);
        clearLine();
        // if (node.status === "skipped" && !currentGroup.only && options.verbose !== "always") return
        if (node.status === "skipped" && options.verbose !== "always")
            return;
        const verbose = options.verbose === "always" || (options.verbose === "auto" && node.status === "failed");
        const currentIndent = indent(depth);
        const nextIndent = indent(depth + 1);
        log(`${currentIndent} ${wrap(icon(node) + " " + text(node) + " " + duration(node), nextIndent, options.wrap)}`);
        // counters
        counts.total += 1;
        counts[node.status] += 1;
        depth++;
        // Tests with errors or warnings also render the description (if any)
        if (node.description && (node.status == "failed" || node.error || node.console.byTags(["warning", "error"]).length)) {
            log(`${nextIndent}${wrap(parseMD(node.description).dim, nextIndent, options.wrap)}`);
        }
        node.console.forEach(entry => logConsoleEntry(entry, verbose));
        logDetails(node);
        depth--;
    }
    function logDetails(node) {
        if (Array.isArray(node.hookErrors) && node.hookErrors.length) {
            let prefix = indent(depth + 1);
            node.hookErrors.forEach(err => {
                log(`${prefix} ${wrap(" hook error ".red + " " + err.stack.red, prefix, options.wrap)}`);
            });
        }
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
exports.default = StdoutReporter;
//# sourceMappingURL=console.js.map