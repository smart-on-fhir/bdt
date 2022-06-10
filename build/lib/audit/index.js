"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("colors");
const events_1 = __importDefault(require("events"));
const pug_1 = __importDefault(require("pug"));
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const errors_1 = require("../errors");
const open_1 = __importDefault(require("open"));
class Audit extends events_1.default {
    constructor(options) {
        super();
        this.options = options;
        this.score = {
            security: { current: 0, total: 0, log: [] },
            compliance: { current: 0, total: 0, log: [] },
            reliability: { current: 0, total: 0, log: [] },
            performance: { current: 0, total: 0, log: [] }
        };
        this.checkModules = [];
    }
    reset() {
        for (let key in this.score) {
            const meta = this.score[key];
            meta.current = 0;
            meta.total = 0;
            meta.log = [];
        }
    }
    async check(options, fn) {
        const { name, description, weights } = options;
        const criteria = ["security", "compliance", "performance", "reliability"];
        criteria.forEach(c => {
            const w = weights[c];
            if (w) {
                if (typeof w === "number") {
                    this.score[c].total += w;
                }
                else {
                    this.score[c].total += w.weight;
                }
            }
        });
        let result;
        try {
            result = await fn();
        }
        catch (e) {
            if (!(e instanceof errors_1.NotSupportedError)) {
                console.error(e);
            }
            result = false;
        }
        criteria.forEach(c => {
            const w = weights[c];
            if (w) {
                const weight = typeof w === "number" ? w : w.weight;
                const weightDescription = typeof w === "number" ? undefined : w.description;
                if (result === true) {
                    this.score[c].current += weight;
                    this.score[c].log.push({
                        label: name,
                        pass: true,
                        description,
                        weight: {
                            weight,
                            description: weightDescription
                        }
                    });
                }
                else {
                    this.score[c].log.push({
                        label: name,
                        pass: false,
                        description,
                        weight: {
                            weight,
                            description: weightDescription
                        }
                    });
                }
            }
        });
        this.emit("progress", this.score, options);
    }
    load() {
        this.checkModules.push(require("./checks/config"), require("./checks/token-endpoint"), require("./checks/kick-off"));
    }
    async run() {
        this.reset();
        // this.emit("progress", this.score)
        for (const m of this.checkModules) {
            await m.suite({
                config: this.options,
                check: this.check.bind(this)
            });
        }
        this.emit("end", this.score);
    }
}
async function report(options, destination, openFile = false) {
    console.log("\nRunning audit for " + options.baseURL + "\n\n\n");
    const audit = new Audit(options);
    audit.load();
    audit.on("progress", (score, check) => {
        const line = [];
        for (const criteria in score) {
            const meta = score[criteria];
            if (meta.total > 0) {
                const pct = Math.round(meta.current / meta.total * 100);
                line.push(criteria.blue.bold + ": " + String(pct + "%").bold +
                    ` (${meta.current}/${meta.total})`.dim);
            }
        }
        process.stdout.write("\u001b[2K\u001b[1A\u001b[2K\u001b[1A\u001b[2K\u001b[1A\u001b[2K\n" +
            "Now running: " +
            check.name.yellow +
            "\n" + line.join("   ") + "\n");
    });
    audit.once("end", score => {
        process.stdout.write("\u001b[2A\u001b[2K" + "FINAL SCORE:".bold + "\u001b[2B\n");
        const html = pug_1.default.renderFile("./audit-report-template.pug", {
            score,
            server: options.baseURL
        });
        fs_1.default.writeFileSync(destination, html);
        console.log(`Report saved to "${path_1.resolve(destination)}"`);
        if (openFile) {
            open_1.default(path_1.resolve(destination)).catch(e => {
                console.log(`Failed opening "${path_1.resolve(destination)}" in browser:`);
                console.error(e);
            });
        }
    });
    await audit.run();
}
exports.default = report;
//# sourceMappingURL=index.js.map