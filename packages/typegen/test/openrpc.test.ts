import assert from "assert";
import fs from "fs";
import { mapParam } from "../src/generate/openrpc/mappings";

/**
 * NOTE: I tried to import the JSON files here with an import statement,
 
       import openRpcJson from "./data/actual/openrpc.json"
       import controlRpcNames from "./data/expected/openrpc.json";
 
       * but the compiler could not locate the module. I'm not sure why, but I 
 * suspect it has to do with path resolution to the JSON file. The cwd
 * logged by NodeJS while running this test is the `typegen` directory. However,
 * the TS compiler records both the ./test as the cwd. If I try to import 
 * the JSON using the typegen dir as root, the TS compiler will not allow
 * the compilation to succeed.
 */

describe('JSON Shape Tests', function () {
  describe('Methods section', function () {
    it('should generate a method section for all methods', async function () {
      const openRpcJson = JSON.parse(fs.readFileSync("./packages/typegen/test/data/actual/openrpc.json").toString());
      const controlRpcNames = JSON.parse(fs.readFileSync("./packages/typegen/test/data/expected/openrpcMethods.json").toString());
      const actualMethodNames = openRpcJson.methods.map((method: any) => method.name)
      controlRpcNames.rpcNames.forEach((name: string) => {
        assert.strictEqual(actualMethodNames.includes(name), true, `${name} does not exist in generated JSON`);
      })
    });
  });

  describe("#mapParam", function() {
    it("should map a param with a complex type", function() {
      const param = mapParam({
        name: "foo",
        type: "FooType",
        isOptional: true,
      });

      assert.strictEqual(param.name, "foo");
      assert.strictEqual(param.type, "FooType");
      assert.notStrictEqual(param.schema, undefined);
      assert.strictEqual(param.schema?.$ref, "#/components/schema/FooType");
    });

    it("should map a param with a primitive type", function() {
      const param = mapParam({
        name: "foo",
        type: "u8",
        isOptional: true,
      });

      assert.strictEqual(param.name, "foo");
      assert.strictEqual(param.type, "u8");
      assert.notStrictEqual(param.schema, undefined);
      assert.strictEqual(param.schema?.type, "integer");
    });
  })
});
