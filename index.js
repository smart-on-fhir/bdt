const APP = require("commander");
const bdt = require("./bdt");

const settings = {};

const reporters = {
    console: require("./reporters/stdout"),
    json   : require("./reporters/json-stream")
};

APP
    .version("0.0.1")
    .option("-p, --pattern [glob]"       , "A glob pattern to load test files from", "testSuite/**/*.test.js")
    .option("-r, --reporter [name]"      , "Specify a reporter to use (console | json)", "console")
    .option("-l, --list"                 , "List loaded structure instead of executing tests")
    .option("-P, --path [path]"          , "Path to the test node to execute (e.g. '0.2' for the third child of the first child of the root node)", "")
    .option("-c, --config [path]"        , "Path to the config file to load. Defaults to './config.js'", "./config.js")
    .option("-v, --api-version [version]", "Bulk Data API version to test for. Example \"1.0\" or \"1.2\"", "1.0")
    .parse(process.argv);


try {
    Object.assign(settings, require(APP.config), { cli: true, version: APP.apiVersion });
} catch (ex) {
    console.error(`Failed to load settings from "${APP.config}". ${ex.message}`);
    process.exit(1);
}

// 1. Create a runner with the given settings
const runner = new bdt.Runner(settings);

// 2. Create and attach a reporter
const reporter = reporters[APP.reporter]();
reporter.attach(runner);

// 3. Load tests
bdt.load(APP.pattern);

// 4. Execute tests or output the structure
if (APP.list) {
    console.log(JSON.stringify(bdt.getPath()));
} else {
    runner.run(bdt.getPath(APP.path));
}
