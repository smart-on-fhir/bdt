"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const commander_1 = __importStar(require("commander"));
const bdt_1 = require("./lib/bdt");
const Config_1 = __importDefault(require("./lib/Config"));
const index_1 = __importDefault(require("./lib/audit/index"));
require("colors");
const program = new commander_1.Command();
program.version("2.0.0");
program.name("bdt");
program.option('-c, --config <path>', 'set config path', '../config.js');
program.addOption(new commander_1.default.Option("-v, --api-version [version]", "Bulk Data API version to test.")
    .choices(["1.0", "2.0"])
    .default("1.0"));
program
    .command('list')
    .description('output loaded test tree structure as JSON')
    .action(() => {
    console.log('read config from %s', program.opts().config);
});
program
    .command("audit")
    .description('Generates audit report')
    .action(async () => {
    const args = program.opts();
    const options = {
        cli: true,
        apiVersion: args.apiVersion
    };
    const configPath = path_1.default.resolve(process.cwd(), args.config);
    try {
        const serverOptions = require(configPath);
        const config = new Config_1.default(serverOptions);
        const normalizedConfig = await config.normalize();
        Object.assign(options, normalizedConfig);
    }
    catch (ex) {
        console.error(`Failed to load settings from "${configPath}".\n`, ex.message.red);
        process.exit(1);
    }
    index_1.default(options);
});
program
    .command('test') // { isDefault: true }
    .description('load tests and execute them')
    .option("-c, --no-colors", "show output without colors", true)
    .option("-w, --wrap [column]", "wrap at column [n]", parseFloat, 100)
    .option("-b, --bail", "exit on first error", false)
    .option("--showConfig", "Print BDT config and exit. Useful for debugging what options have been loaded")
    .addOption(new commander_1.default.Option("-v, --verbose [value]", 'When to show full details. "auto" means that full details will only be shown for failed tests')
    .choices(["always", "never", "auto"])
    .default("auto"))
    .addOption(new commander_1.default.Option("-r, --reporter <name>", "Specify a reporter to use")
    .choices(["console", "json", "stdout"])
    .default("console"))
    .action(async (commandOptions) => {
    const args = program.opts();
    const options = {
        cli: true,
        apiVersion: args.apiVersion,
        bail: commandOptions.bail,
        // match: "",
        reporter: commandOptions.reporter,
        pattern: "./build/testSuite/**/*.test.js",
        list: false,
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
    // console.log(process.cwd())
    // console.log(__dirname)
    const configPath = path_1.default.resolve(process.cwd(), args.config);
    try {
        // Object.assign(options, require(configPath));
        const serverOptions = require(configPath);
        const config = new Config_1.default(serverOptions);
        const normalizedConfig = await config.normalize();
        // console.log(normalizedConfig)
        Object.assign(options, normalizedConfig);
    }
    catch (ex) {
        console.error(`Failed to load settings from "${configPath}".\n`, ex.message.red);
        process.exit(1);
    }
    if (commandOptions.showConfig) {
        console.log(options);
        return;
    }
    // console.log(options)
    // console.log(args)
    // console.log(commandOptions)
    bdt_1.bdt(options);
});
//     // .option("-p, --pattern [glob]"       , "A glob pattern to load test files from", "../testSuite/**/*.test.js")
// program.option("-r, --reporter [name]"      , "Specify a reporter to use (console | json)", "console")
// program.option("-l, --list"                 , "List loaded structure instead of executing tests")
//     // .option("-P, --path [path]"          , "Path to the test node to execute (e.g. '0.2' for the third child of the first child of the root node)", "")
// program.option("-c, --config [path]"        , "Path to config file to load. Defaults to '../config.js'", "../config.js")
// program.option("-v, --api-version [version]", "Bulk Data API version to test. Example \"1.0\", \"1.2\", \"2\"", "1.0")
//     // .option("-b, --bail"                 , "Exit on first error")
//     // .option("-m, --match [RegExp]"       , "JS case-insensitive RegExp to run against the test name", "")
// program.option("-V, --verbose", "Pass options to the chosen reporter")    
// program.option("--reporter-arg <name=value...>", "Pass options to the chosen reporter")
async function main() {
    // program.parse(process.argv);
    await program.parseAsync(process.argv);
}
main();
//# sourceMappingURL=index.js.map