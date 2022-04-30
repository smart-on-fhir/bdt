# bdt
BDT as Bulk Data testing app for CLI

## Installation
**Prerequisites:** Make sure you have `git` and `NodeJS` version >= 14 installed
```sh
git clone https://github.com/smart-on-fhir/bdt
cd bdt
npm i
```

## Contribution
Contributions are welcome, just make sure you check out the [API Docs](https://docs.smarthealthit.org/bdt/api/index.html) first.

## CLI Usage

**Quick start**
```sh
# Here "my/config.js" is the path to your configuration file
node . test --config my/config.js
```

### Commands
The bdt tool contains 3 subcommands:
- `test` - Runst the test suite
- `list` - List available tests (useful for third-party integration)
- `audit` - Generates audit reports

The usage is
```sh
node . [options] [command]
# or
node . [command] [options]
```
For more information run one of:
- `node . --help` - common usage
- `node . help test` - **test** command usage
- `node . help list` - **list** command usage
- `node . help audit` - **audit** command usage

## Examples

Tests a server
```sh
node . test -c config-examples/reference-server-r4.js
```

Tests a server but only run authorization-related tests
```sh
node . test -c config-examples/reference-server-r4.js --pattern './build/testSuite/**/authorization.test.js'
```

Tests a server against Bulk Data v2
```sh
node . test -c config-examples/reference-server-r4.js --api-version 2
```