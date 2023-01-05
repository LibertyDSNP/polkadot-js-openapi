// Copyright 2017-2022 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { TypeRegistry } from '@polkadot/types/create';
import type { Definitions } from '@polkadot/types/types';
import type { ExtraTypes } from './types';

import Handlebars from 'handlebars';

import * as defaultDefinitions from '@polkadot/types/interfaces/definitions';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';

import { createImports, initMeta, readTemplate, writeFile } from '../util';

interface ORObject {
  type: "object";
  properties: {};
  required: string[];
}

interface ORArray {
  type: "array";
  items: {};
}

interface ORType {
  type: string;
}
interface ORSchema {
  type?: string;
}
interface ORParamSchema {
  type?: string;
  $ref?: string;
};
interface ORParam {
  name: string;
  description: string;
  type: string;
  required: boolean;
  schema?: ORParamSchema;
}
interface ORMethod {
  pallet?: string;
  name: string;
  params: [];
  result?: string;
}

const typeToOpenRPCType = new Map<string, string>([
  ['bool', 'boolean'],
  ['string', 'string'],
  ['u8', 'integer'],
  ['u16', 'integer'],
  ['u32', 'integer'],
  ['u64', 'integer'],
  ['u128', 'integer'],
  ['i8', 'integer'],
  ['i16', 'integer'],
  ['i32', 'integer'],
  ['i64', 'integer'],
  ['i128', 'integer']
]);

const generateRpcTypesTemplate = Handlebars.compile(readTemplate('openrpc'));

// Why is this a separate function?
function lookupComponent(type: string) {
  console.log("lookup of " + type);
}

function mapParams(inputParams): ORParam[] {
  const params = [];
  for (const defp of inputParams) {
    let param: ORParam = {
      name: defp.name,
      description: "",
      type: defp.type,
      required: defp.isOptional ?? true,
      schema: {} as ORParamSchema
    };

    let stype = typeToOpenRPCType.get(defp.type);
    console.log(defp.type + " -> " + stype + " TYPE=" + typeof stype);

    let schema: ORParamSchema;
    if (stype !== undefined) {
      schema = {
        type: stype
      }
    }
    else {
      schema = {
        $ref: "#/components/schema/" + defp.type
      }
    }
    param.schema = schema;
    params.push(param);
  }
  return params;
}


function mapMethod(methodName: string, sectionName: string, methodParams: any, methods: any[]): ORMethod {
  let type;
  let params: ORParam[] = mapParams(methodParams);

  let method: ORMethod = {
    pallet: sectionName,
    name: methodName,
    params: params,
    result: type
  } as ORMethod;

  methods.push(method);

  return method;
}

/** @internal */
export function generateRpcTypes(registry: TypeRegistry, importDefinitions: Record<string, Definitions>, dest: string, extraTypes: ExtraTypes): void {
  writeFile(dest, (): string => {
    const allTypes: ExtraTypes = { '@polkadot/types/interfaces': importDefinitions, ...extraTypes };
    const imports = createImports(allTypes);
    const definitions = imports.definitions as Record<string, Definitions>;
    const allInterfaces = allTypes["@polkadot/types/interfaces"];

    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context);
    });

    // get all rpc definitions
    const rpcKeys = Object
      .keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .sort();

    const methods: object[] = [];

    rpcKeys.forEach((sectionFullName) => {
      const rpc = definitions[sectionFullName].rpc || {};
      // Example:
      // getKeysPaged: {
      //   alias: [ 'childstate_getKeysPagedAt' ],
      //   description: 'Returns the keys with prefix from a child storage with pagination support',
      //   params: [ [Object], [Object], [Object], [Object], [Object] ],
      //   type: 'Vec<StorageKey>'
      // },
      const sectionName = sectionFullName.split('/').pop();

      Object.keys(rpc).sort().forEach((methodName) => {
        mapMethod(methodName, sectionName, rpc[methodName].params, methods)
      });
    })

    let json = generateRpcTypesTemplate({
      methods
    });

    let parsed;
    let stringified;
    try {
      parsed = JSON.parse(json);
      stringified = JSON.stringify(parsed, null, 2);
    }
    catch (e) {
      console.error(e);
      throw e;
    }

    return stringified;
  });
}

export function generateDefaultOpenRPC(dest: string, extraTypes: ExtraTypes = {}): void {
  const { registry } = initMeta(staticSubstrate, extraTypes);

  generateRpcTypes(
    registry,
    defaultDefinitions,
    dest,
    extraTypes
  );
}
