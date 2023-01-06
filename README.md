# @polkadot/api

This library provides a clean wrapper around all the methods exposed by a Polkadot/Substrate network client and defines all the types exposed by a node. For complete documentation around the classes, interfaces and their use, visit the [documentation portal](https://polkadot.js.org/docs/api/).

If you are an existing user, please be sure to track the [CHANGELOG](CHANGELOG.md) and [UPGRADING](UPGRADING.md) guides when changing versions.

## tutorials

Looking for tutorials to get started? Look at [examples](https://polkadot.js.org/docs/api/examples/promise/) for guides on how to use the API to make queries and submit transactions.

# OpenRPC

This fork includes a modified *typegen* utility that can generate an *OpenRPC* document.

### Setup

Create a folder for the output file(s):

```mkdir output_directory```

Install the project:

```yarn install```

### Usage

```yarn polkadot-types-from-chain --openrpc --endpoint ws://127.0.0.1:9944 --output FOLDER_THAT_MUST_ALREADY_EXIST```

### Tests
Run tests with
```
make test-openrpc-typegen
```
### Note

To add support for additional complex types, you must:

* Add a ```$ref``` mapping for each to the code in ```openrpc.ts```:

```['AccountId32', { $ref: '#/components/schemas/AccountId32' }],```


* Add an entry to the *handlebars* template ```openrpc.hbs``` for the new complex type:

```
  "components": {
    "schemas": {
      "AccountId32": {
        "title": "AccountId32",
        "description": "A 32-byte encoded account identifier used to identify accounts on the Polkadot network",
        "type": "string",
        "pattern": "^[a-fA-F0-9]{64}$"
      }
    }
  }
```

See also:

[OpenRPC](https://open-rpc.org)

[handlebars](https://handlebarsjs.com)
