import Path                                       from "path"
import commander, { Command }                     from "commander"
import { bdt, Config as ConfigType }              from "./lib/bdt"
import Config, { NormalizedConfig, ServerConfig } from "./lib/Config"
import audit                                      from "./lib/audit/index"
import "colors"


async function getConfig(path: string): Promise<NormalizedConfig> {
    const configPath = Path.resolve(process.cwd(), path);
    try {
        const options = require(configPath)
        try {
            await Config.validate(options)
        } catch (ex) {
            console.log(`Found some errors in your configuration file. Please fix them first.`.bold)
            console.log(ex.message.red)
            process.exit(1)
        }
        const config  = new Config(options)
        return await config.normalize() as ConfigType
    } catch (ex) {
        throw new Error(
            `Failed to load settings from "${configPath}".\n${ex.message.red}`
        );
    }
}

const program = new Command();
program.version("2.0.0")
program.name("bdt")


// =============================================================================
//                                    list
// =============================================================================
// List the test tree as JSON structure. Useful for clients that may want to use
// this to build test list UI.
// Examples
//   node . list
//   node . list --path '2.2'
//   node . list --api-version '1.3'
//   node . list --pattern './build/testSuite/authorization.test.js'
program
    .command('list')
    .description('output loaded test tree structure as JSON')
    .option("-p, --path [path]"          , "List the sub-tree at the given path"       , "")
    .option("-v, --api-version [version]", "List only nodes matching the given version", "")
    .option("-f, --pattern [glob]"       , "A glob pattern to load test files from (relative to cwd)", "./build/testSuite/**/*.test.js")
    .action(async (options) => { bdt({ ...options, list: true } as ConfigType) });


// =============================================================================
//                                    audit
// =============================================================================
// Experimental feature! This will run a variety of checks against the given
// server and generate an audit report for it, giving it a score for Security,
// Compliance and Reliability.
program
    .command("audit")
    .description('Generates audit report')
    .option('-c, --config <path>', 'set config path', './config.js')
    .action(async (commandOptions) => {
        const args    = program.opts()
        const config  = await getConfig(commandOptions.config)
        const options = Object.assign(config, {
            cli       : true,
            apiVersion: args.apiVersion,
            path      : ""
        }) as ServerConfig;
        audit(options as ConfigType)
    });


// =============================================================================
//                                    test
// =============================================================================
program
    .command('test') // { isDefault: true }
    .description('load tests and execute them')
    .option('-c, --config <path>'        , 'set config path', './config.js')
    .option("-V, --api-version [version]", "List only nodes matching the given version", "1.0")
    .option("-c, --no-colors"            , "show output without colors", true)
    .option("-w, --wrap [column]"        , "wrap at column [n]", parseFloat, 160)
    .option("-b, --bail"                 , "exit on first error", false)
    .option("-s, --showConfig"           , "Print BDT config and exit. Useful for debugging what options have been loaded")
    .option("-m, --match [RegExp]"       , "JS case-insensitive RegExp to run against the test name", "")
    .option("-p, --path [path]"          , "Path to the test node to execute (e.g. '0.2' for the third child of the first child of the root node)", "")
    .option("-P, --pattern [glob]"       , "A glob pattern to load test files from", "./build/testSuite/**/*.test.js")
    .addOption(
        new commander.Option("-v, --verbose [value]", 'When to show full details. "auto" means that full details will only be shown for failed tests')
        .choices(["always", "never", "auto"])
        .default("auto"))
    .addOption(
        new commander.Option("-r, --reporter <name>", "Specify a reporter to use")
        .choices(["console", "json", "stdout"])
        .default("console")
    )
    .action(async (commandOptions) => {
        let config: Record<string, any> = await getConfig(commandOptions.config)

        Object.assign(config, {
            apiVersion: commandOptions.apiVersion,
            bail      : commandOptions.bail,
            match     : commandOptions.match,
            reporter  : commandOptions.reporter,
            pattern   : commandOptions.pattern,
            path      : commandOptions.path,
            list      : false,
            cli       : true,
            reporterOptions: {
                wrap   : commandOptions.wrap,
                colors : commandOptions.colors,
                verbose: commandOptions.verbose
            }
        });

        if (config.showConfig) {
            console.log(config)
            return
        }

        // console.log(config)
        bdt(config as ConfigType)
    })



async function main() {
    await program.parseAsync(process.argv);
}

main()
