const APP      = require("commander");
const bdt      = require("./bdt");
const IPC      = require("./reporters/ipc");
const Reporter = require("./reporters/stdout");
const settings = require("./config.js");


APP
    .version("0.0.1")
    .option("-p, --pattern [glob]" , "A glob pattern to load test files from", "./**/*.test.js")
    // .option("-r, --reporter [name]", "Specify a reporter to use", "stdout")
    // .option("-t, --timeout [ms]"   , "set test-case timeout in milliseconds", 2000)
    // .option("-w, --watch"          , "watch files for changes")
    .parse(process.argv);

// 1. Create a runner with the given settings
const runner = new bdt.Runner(settings);

// 2. Create and attach a reporter
const reporter = new Reporter();
reporter.attach(runner);

// 3. Also attach an IPC reporter in case the process is forked with an IPC channel
const ipc = new IPC();
ipc.attach(runner);

// 4. Load tests
bdt.load(APP.pattern);

// 5. Execute tests
runner.run();
