# bdt
BDT as Bulk Data testing app for CLI

## Installation
**Prerequisites:** Make sure you have `git` and `NodeJS` version >= 14 installed
```sh
git clone https://github.com/smart-on-fhir/bdt
cd bdt
npm i

# To register bdt as globally available executable also run this:
npm i -g .
# Otherwise you will have to run it using "node ." from the project folder
```

## Contribution
Contributions are welcome, just make sure you check out the [API Docs](https://docs.smarthealthit.org/bdt/api/index.html) first.

## CLI Usage

**Quick start**
```sh
# Here "my/config.js" is the path to your configuration file
bdt test --config my/config.js
```

### Commands
The bdt tool contains 3 subcommands:
- `test` - Runs the test suite
- `list` - List available tests (useful for third-party integration)
- `audit` - Generates audit reports

The usage is
```sh
bdt [options] [command]
# or
bdt [command] [options]
```
For more information run one of:
- `bdt --help` - common usage
- `bdt help test` - **test** command usage
- `bdt help list` - **list** command usage
- `bdt help audit` - **audit** command usage

## Examples

Tests a server
```sh
bdt test -c config-examples/reference-server-r4.js
```

Tests a server but only run authorization-related tests
```sh
bdt test -c config-examples/reference-server-r4.js --pattern './build/testSuite/**/authorization.test.js'
```

Tests a server against Bulk Data v2
```sh
bdt test -c config-examples/reference-server-r4.js --api-version 2
```