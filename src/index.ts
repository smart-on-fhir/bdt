import Path                          from "path"
import commander, { Command }        from "commander"
import { bdt, Config as ConfigType } from "./lib/bdt"
import Config                        from "./lib/Config"
import audit                         from "./lib/audit/index"
import "colors"



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
    .action(() => {
        console.log('read config from %s', program.opts().config);
    });

// =============================================================================
//                                    audit
// =============================================================================
// Experimental feature! This will run a variety of checks against the given
// server and generate an audit report for it, giving it a score for Security,
// Compliance and Reliability.
program
    .command("audit")
    .description('Generates audit report')
    .action(async () => {
        const args = program.opts();
        const options: Partial<ConfigType> = {
            cli       : true,
            apiVersion: args.apiVersion
        };

        const configPath = Path.resolve(process.cwd(), args.config);
        try {
            const serverOptions = require(configPath);
            const config = new Config(serverOptions)
            const normalizedConfig = await config.normalize()
            Object.assign(options, normalizedConfig)
        } catch (ex) {
            console.error(
                `Failed to load settings from "${configPath}".\n`,
                ex.message.red
            );
            process.exit(1);
        }

        audit(options as ConfigType)
    });


// =============================================================================
//                                    test
// =============================================================================
program
    .command('test') // { isDefault: true }
    .description('load tests and execute them')
    .option("-c, --no-colors"    , "show output without colors", true)
    .option("-w, --wrap [column]", "wrap at column [n]", parseFloat, 100)
    .option("-b, --bail"         , "exit on first error", false)
    .option("--showConfig"       , "Print BDT config and exit. Useful for debugging what options have been loaded")
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
        const args = program.opts();

        const options: Partial<ConfigType> = {
            cli       : true,
            apiVersion: args.apiVersion,
            bail      : commandOptions.bail,
            // match: "",
            reporter  : commandOptions.reporter,
            pattern   : "./build/testSuite/**/*.test.js",
            list      : false,
            // path: "",
            reporterOptions: {
                // logHttpRequests: commandOptions.verbose,
                // logHttpResponses: commandOptions.verbose,
                // logErrorStacks: commandOptions.verbose,
                wrap: commandOptions.wrap,
                colors: commandOptions.colors,
                verbose: commandOptions.verbose
            }
        };

        const configPath = Path.resolve(process.cwd(), commandOptions.config);
        try {
            const serverOptions = require(configPath);
            const config = new Config(serverOptions)
            const normalizedConfig = await config.normalize()
            Object.assign(options, normalizedConfig)
        } catch (ex) {
            console.error(
                `Failed to load settings from "${configPath}".\n`,
                ex.message.red
            );
            process.exit(1);
        }

        if (commandOptions.showConfig) {
            console.log(options)
            return
        }
        // console.log(options)
        bdt(options as ConfigType)
    })

    // program.option("--reporter-arg <name=value...>", "Pass options to the chosen reporter")

async function main() {
    await program.parseAsync(process.argv);
}

main()
