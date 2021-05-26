# bdt
BDT as Bulk Data testing app for CLI

## Installation
**Prerequisites:** Make sure you have `git` and `NodeJS` version >= 14 installed
```sh
git clone https://github.com/smart-on-fhir/bdt
cd ./bdt
npm i
```

## [API Docs](https://docs.smarthealthit.org/bdt/api/index.html)

## CLI Usage

**Quick start**
```sh
# Her "my/config.js" is the path to the configuration file for your server
node . test --config my/config.js
```

**list**
Outputs a JSON tree structure with all the tests without executing them.
- Run `bdt help list` for more info

**help**
Running `bdt` with no options (`node .`), or running `node . help` will print a message like this:
```
Usage: node . [options] [command]

Options:
  -V, --version                output the version number
  -c, --config <path>          set config path (default: "../config.js")
  -v, --api-version [version]  Bulk Data API version to test. (choices: "1.0", "2.0", default: "1.0")
  -h, --help                   display help for command

Commands:
  list                         output loaded test tree structure as JSON
  test [options]               load tests and execute them
  help [command]               display help for command
```

