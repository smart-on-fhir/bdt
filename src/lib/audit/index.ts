import "colors"
import { bdt } from "../../../types"
import EventEmitter from "events"
import pug from "pug"
import fs from "fs"
import { resolve } from "path"
import { NotSupportedError } from "../errors"
import open from "open"


type weight = 1 | 2 | 3 | 4 | 5

interface WeightDescriptor {
    weight: weight,
    description?: string
}

interface Score {
    security   : { current: number, total: number, log: LogEntry[] }
    compliance : { current: number, total: number, log: LogEntry[] }
    reliability: { current: number, total: number, log: LogEntry[] }
    performance: { current: number, total: number, log: LogEntry[] }
}

interface LogEntry {
    label: string
    pass: boolean
    weight: WeightDescriptor
    description?: string
}

type Weights = {
    security?: weight | WeightDescriptor
    compliance?: weight | WeightDescriptor
    reliability?: weight | WeightDescriptor
    performance?: weight | WeightDescriptor
} 

export type suiteFunction = (ctx: { config: bdt.NormalizedConfig, check: (options: checkOptions, fn: () => any) => Promise<void> }) => any

interface checkOptions {
    name: string
    weights: Weights
    minVersion?: string
    maxVersion?: string
    description?: string
}

class Audit extends EventEmitter
{
    private score: Score = {
        security   : { current: 0, total: 0, log: [] },
        compliance : { current: 0, total: 0, log: [] },
        reliability: { current: 0, total: 0, log: [] },
        performance: { current: 0, total: 0, log: [] }
    };

    private checkModules: { suite: suiteFunction }[] = [];

    constructor(private options: bdt.BDTOptions) {
        super()
    }

    private reset() {
        for (let key in this.score) {
            const meta = this.score[key as keyof Score];
            meta.current = 0
            meta.total = 0
            meta.log = []
        }
    }

    async check(options: checkOptions, fn: () => any): Promise<void>
    {
        const { name, description, weights } = options

        const criteria: (keyof Score)[] = ["security", "compliance", "performance", "reliability"];

        criteria.forEach(c => {
            const w = weights[c];
            if (w) {
                if (typeof w === "number") {
                    this.score[c].total += w
                } else {
                    this.score[c].total += w.weight;
                }
            }
        });

        let result: boolean;
        try {
            result = await fn();
        } catch (e) {
            if (!(e instanceof NotSupportedError)) {
                console.log("\n\n\n")
                console.error(e)
            }
            result = false
        }

        criteria.forEach(c => {
            const w = weights[c];
            if (w) {
                const weight = typeof w === "number" ? w : w.weight;
                const weightDescription = typeof w === "number" ? undefined : w.description;
                if (result === true) {
                    this.score[c].current += weight
                    this.score[c].log.push({
                        label: name,
                        pass: true,
                        description,
                        weight: {
                            weight,
                            description: weightDescription
                        }
                    })
                } else {
                    this.score[c].log.push({
                        label: name,
                        pass: false,
                        description,
                        weight: {
                            weight,
                            description: weightDescription
                        }
                    })
                }
            }
        });

        this.emit("progress", this.score, options)
    }

    load() {
        this.checkModules.push(
            require("./checks/config"),
            require("./checks/token-endpoint"),
            require("./checks/kick-off")
        )
    }

    async run() {
        this.reset()
        // this.emit("progress", this.score)
        for (const m of this.checkModules) {
            await m.suite({
                config: this.options,
                check: this.check.bind(this)
            })
        }
        this.emit("end", this.score)
    }
}



async function report(options: bdt.BDTOptions, destination: string, openFile = false) {
    console.log("\nRunning audit for " + options.baseURL + "\n\n\n")
    const audit = new Audit(options)
    audit.load()
    audit.on("progress", (score, check) => {
        const line: string[] = []
        
        for (const criteria in score) {
            const meta = score[criteria as keyof Score];
            if (meta.total > 0) {
                const pct  = Math.round(meta.current / meta.total * 100)
                line.push(criteria.blue.bold + ": " + String(pct + "%").bold +
                ` (${meta.current}/${meta.total})`.dim)
            }
        }
        process.stdout.write(
            "\u001b[2K\u001b[1A\u001b[2K\u001b[1A\u001b[2K\u001b[1A\u001b[2K\n" +
            "Now running: " + 
            check.name.yellow +
            "\n" + line.join("   ") + "\n")
    })

    audit.once("end", score => {
        const html = pug.renderFile("./audit-report-template.pug", {
            score,
            server: options.baseURL
        });
        if (destination) {
            destination = resolve(process.cwd(), destination)
            fs.writeFileSync(destination, html)
            console.log(`Report saved to "${destination}"`)
            if (openFile) {
                open(destination).catch(e => {
                    console.log(`Failed opening "${destination}" in browser:`)
                    console.error(e)
                });
            }
        } else {
            console.log(html)
        }
    })

    await audit.run()
    

}

export default report
