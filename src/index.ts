import Path                          from "path"
import commander, { Command }        from "commander"
import { bdt, Config as ConfigType } from "./lib/bdt"
import Config, { NormalizedConfig, ServerConfig }                        from "./lib/Config"
import audit                         from "./lib/audit/index"
import "colors"
import { writeFileSync } from "fs"


async function getConfig(path: string): Promise<NormalizedConfig> {
    const configPath = Path.resolve(process.cwd(), path);
    try {
        const options = require(configPath)
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
                // logHttpRequests: commandOptions.verbose,
                // logHttpResponses: commandOptions.verbose,
                // logErrorStacks: commandOptions.verbose,
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

    // program.option("--reporter-arg <name=value...>", "Pass options to the chosen reporter")

// =============================================================================
// init
// =============================================================================
program
    .command('init') // { isDefault: true }
    .description('Generates a configuration file')
    .action(async (commandOptions) => {
        const txt = 'module.exports = {\n' +
        '    /**\n' +
        '     * FHIR server base URL.\n' +
        '     */\n' +
        '    baseURL: "",\n' +
        '\n' +
        '    authentication: {\n' +
        '        /**\n' +
        '         * Can be:\n' +
        '         * - `backend-services` (*default*) all tests will be executed.\n' +
        '         * - `client-credentials` - uses client_id and client_secret. Most of the\n' +
        '         *    authorization tests will be skipped.\n' +
        '         * - `none` - no authorization will be performed and all the authorization \n' +
        '         *    tests will be skipped.\n' +
        '         */\n' +
        '        type: "none",\n' +
        '\n' +
        '        /**\n' +
        '         * Set to true if auth if supported but not required\n' +
        '         */\n' +
        '        optional: false,\n' +
        '\n' +
        '        /**\n' +
        '         * Required if authType is other than "none"\n' +
        '         */\n' +
        '        clientId: "",\n' +
        '\n' +
        '        /**\n' +
        '         * Required if authType is set to "client-credentials"\n' +
        '         */\n' +
        '        clientSecret: "",\n' +
        '\n' +
        '        /**\n' +
        '         * Not used if authType is set to "none"\n' +
        '         * Defaults to "system/*.read"\n' +
        '         */\n' +
        '        scope: "system/*.read",\n' +
        '\n' +
        '        /**\n' +
        '         * The full URL of the token endpoint. Required, unless authType is set\n' +
        '         * to "none"\n' +
        '         */\n' +
        '        tokenEndpoint: "",\n' +
        '\n' +
        '        privateKey: { /* your private JWK */ },\n' +
        '\n' +
        '        /**\n' +
        '         * Custom values to be merged with the authentication token claims.\n' +
        '         * NOTE that the following cannot be overridden:\n' +
        '         * - `iss` (equals the clientId)\n' +
        '         * - `sub` (equals the clientId)\n' +
        '         * - `aud` (equals the tokenUrl)\n' +
        '         * - `jti` random value generated at runtime\n' +
        '         */ \n' +
        '        customTokenClaims: {},\n' +
        '\n' +
        '        /**\n' +
        '         * Custom properties to be merged with the authentication token\n' +
        '         * header before signing it.\n' +
        '         * NOTE that the following cannot be overridden:\n' +
        '         * - `typ` (equals "JWT")\n' +
        '         * - `alg` (@see `tokenSignAlgorithm` below)\n' +
        '         * - `kty` (equals the private key `kty`)\n' +
        '         * - `jku` (equals the current `jwks_url` if any)\n' +
        '         */\n' +
        '        customTokenHeaders: {},\n' +
        '\n' +
        '        /**\n' +
        '         * The specifications states that:\n' +
        '         * > *The authentication JWT SHALL include the following claims, and\n' +
        '         *   SHALL be signed with the client’s private key (which **SHOULD\n' +
        '         *   be an RS384 or ES384 signature**).*\n' +
        '         * \n' +
        '         * We sign with RS384 by default, but allow more!\n' +
        '         * Acceptable values are: RS256, RS384, RS512, ES256, ES384 and ES512\n' +
        '         */\n' +
        '        tokenSignAlgorithm: "ES384", // Change if needed!\n' +
        '\n' +
        '        /**\n' +
        '         * Expressed in seconds or a string describing a time span (Eg: `60`,\n' +
        '         * `"2 days"`, `"10h"`, `"7d"`. A numeric value is interpreted as\n' +
        '         * a seconds count. If you use a string be sure you provide the time\n' +
        '         * units (days, hours, etc), otherwise milliseconds unit is used by\n' +
        '         * default ("120" is equal to "120ms").\n' +
        '         * If not provided, we will use "5m" as default.\n' +
        '         * @see https://github.com/zeit/ms\n' +
        '         */\n' +
        '        tokenExpiresIn: "5m",\n' +
        '\n' +
        '        /**\n' +
        '         * \n' +
        '         */\n' +
        '        jwksUrl: ""\n' +
        '    },\n' +
        '\n' +
        '    /**\n' +
        '     * Custom options for every request, EXCLUDING the authorization request.\n' +
        '     * Many options are available so be careful what you specify here! Some\n' +
        '     * useful options are hinted below.\n' +
        '     * @see https://github.com/sindresorhus/got/blob/main/documentation/2-options.md\n' +
        '     * @type {import("got/dist/source").OptionsOfUnknownResponseBody}\n' +
        '     */\n' +
        '    requests: {\n' +
        '        strictSSL: true,\n' +
        '        timeout: 30000,\n' +
        '        customHeaders: {},\n' +
        '    },\n' +
       '\n' +
        '    groupId: "",\n' +
       '\n' +
        '    /**\n' +
        '     * By default BDT will fetch and parse the CapabilityStatement to try to\n' +
        '     * detect if the server supports system-level export and at what endpoint.\n' +
        '     * To speed up initialization (or if the server does not have a\n' +
        '     * CapabilityStatement or if it is not properly declaring its system\n'+
        '     * export capabilities), you can skip that check by declaring the\n' +
        '     * `systemExportEndpoint` below. The value should be a path\n' +
        '     * relative to the `baseURL` (typically just "$export").\n' +
        '     * If the server does not support system-level export set this to\n' +
        '     * empty string.\n' +
        '     */\n' +
        '    systemExportEndpoint: "$export", // will be auto-detected if not defined\n' +
       '\n' +
        '    /**\n' +
        '     * By default BDT will fetch and parse the CapabilityStatement to try to\n' +
        '     * detect if the server supports patient-level export and at what endpoint.\n' +
        '     * To speed up initialization (or if the server does not have a\n' +
        '     * CapabilityStatement or if it is not properly declaring its patient\n'+
        '     * export capabilities), you can skip that check by declaring the\n' +
        '     * `patientExportEndpoint` below. The value should be a path\n' +
        '     * relative to the `baseURL` (typically just "Patient/$export").\n' +
        '     * If the server does not support patient-level export set this to\n' +
        '     * empty string.\n' +
        '     */\n' +
        '    patientExportEndpoint: "Patient/$export", // will be auto-detected if not defined\n' +
       '\n' +
        '    /**\n' +
        '     * By default BDT will fetch and parse the CapabilityStatement to try to\n' +
        '     * detect if the server supports group-level export. If so, and if `groupId`\n' +
        '     * is set group-level tests will be enabled.\n' +
        '     * However, if the server does not have a CapabilityStatement or if it is\n' +
        '     * not properly declaring the group export support, you can skip that\n' +
        '     * check by declaring the `groupExportEndpoint` below. The value should be\n' +
        '     * a path relative to the `baseURL` (typically "Group/{GroupID}/$export").\n' +
        '     * Note that if you set this, then the `groupId` option will not be used\n' +
        '     * since the `groupId` is already part of the `groupExportEndpoint` path.\n' +
        '     */\n' +
        '    groupExportEndpoint: "", // will be auto-detected if not defined\n' +
       '\n' +
        '    fastestResource: "Patient",\n' +
        '\n' +
        '    supportedResourceTypes: ["Patient"]\n' +
        '};\n'

        writeFileSync("./test-config.js", txt)
    });


async function main() {
    await program.parseAsync(process.argv);
}

main()
