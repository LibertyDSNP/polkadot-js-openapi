// Copyright 2017-2022 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { TypeRegistry } from '@polkadot/types/create';
import type { Definitions } from '@polkadot/types/types';
import type { ExtraTypes } from './types';

import Handlebars from 'handlebars';

import * as defaultDefinitions from '@polkadot/types/interfaces/definitions';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';

import { createImports, initMeta, readTemplate, writeFile } from '../util';

interface ORParamSchema {
  type?: string;
  $ref?: string;
};
interface ORParam {
  name: string;
  description: string;
  required: boolean;
  schema?: ORParamSchema;
}
interface ORMethod {
  pallet?: string;
  name: string;
  params: [];
  result?: string;
}
interface ItemDef {
  args: string;
  docs: string[];
  generic: string | undefined;
  name: string;
  type: string | undefined;
}

interface ModuleDef {
  items: ItemDef[];
  name: string;
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

const StorageKeyType = 'StorageKey | string | Uint8Array | any';

const generateRpcTypesTemplate = Handlebars.compile(readTemplate('openrpc'));

/** @internal */
export function generateRpcTypes(registry: TypeRegistry, importDefinitions: Record<string, Definitions>, dest: string, extraTypes: ExtraTypes): void {
  writeFile(dest, (): string => {
    const allTypes: ExtraTypes = { '@polkadot/types/interfaces': importDefinitions, ...extraTypes };
    const imports = createImports(allTypes);
    const definitions = imports.definitions as Record<string, Definitions>;
    // const allDefs = Object.entries(allTypes).reduce((defs, [path, obj]) => {
    //   return Object.entries(obj).reduce((defs, [key, value]) => ({ ...defs, [`${path}/${key}`]: value }), defs);
    // }, {});

    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context);
    });

    const rpcKeys = Object
      .keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .sort();

    const allRPCMethods: object[] = [];

    //const additional: Record<string, ModuleDef> = {};
    const modules = rpcKeys.map((sectionFullName) => {
      const rpc = definitions[sectionFullName].rpc || {};
      const section = sectionFullName.split('/').pop();

      const allMethods = Object.keys(rpc).sort().map((methodName) => {
        const def = rpc[methodName];

        let args;
        let type;
        let generic;

        // // These are too hard to type with generics, do manual overrides
        // if (section === 'state') {
        //   setImports(allDefs, imports, ['Codec', 'Hash', 'StorageKey', 'Vec']);

        //   if (methodName === 'getStorage') {
        //     generic = 'T = Codec';
        //     args = [`key: ${StorageKeyType}, block?: Hash | Uint8Array | string`];
        //     type = 'T';
        //   } else if (methodName === 'queryStorage') {
        //     generic = 'T = Codec[]';
        //     args = [`keys: Vec<StorageKey> | (${StorageKeyType})[], fromBlock?: Hash | Uint8Array | string, toBlock?: Hash | Uint8Array | string`];
        //     type = '[Hash, T][]';
        //   } else if (methodName === 'queryStorageAt') {
        //     generic = 'T = Codec[]';
        //     args = [`keys: Vec<StorageKey> | (${StorageKeyType})[], at?: Hash | Uint8Array | string`];
        //     type = 'T';
        //   } else if (methodName === 'subscribeStorage') {
        //     generic = 'T = Codec[]';
        //     args = [`keys?: Vec<StorageKey> | (${StorageKeyType})[]`];
        //     type = 'T';
        //   }

        //   // TEST
        //   args = [];
        // }

        // if (args === undefined) {
        //   setImports(allDefs, imports, [def.type]);

        //   // args = def.params.map((param) => {
        //   //   const similarTypes = getSimilarTypes(registry, definitions, param.type, imports);

        //   //   setImports(allDefs, imports, [param.type, ...similarTypes]);

        //   //   return `${param.name}${param.isOptional ? '?' : ''}: ${similarTypes.join(' | ')}`;
        //   // });

        //   type = formatType(registry, allDefs, def.type, imports);
        //   generic = '';

        //   // TEST
        //   console.log(section + " / " + methodName);
        //   //console.dir(def.params);
        //   args = def.params;
        // }

        let params: ORParam[] = [];

        for (const defp of def.params) {
          let param: ORParam = {
            name: defp.name,
            description: "",
            required: defp.isOptional ?? true,
            schema: {
            } as ORParamSchema
          };

          let stype = typeToOpenRPCType.get(defp.type);
          console.log(defp.type + " -> " + stype + " TYPE=" + typeof stype);

          let schema: ORParamSchema;
          if (!!stype) {
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
        console.dir(params);

        let method: ORMethod = {
          pallet: section,
          name: methodName,
          params: params,
          result: type
        } as ORMethod;

        allRPCMethods.push(method);

        return method;
      }).filter((method): method is ORMethod => !!method);

      return {
        items: allMethods,
        name: section || 'unknown'
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // imports.typesTypes.Observable = true;

    let json = generateRpcTypesTemplate({
      allRPCMethods
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
    // console.dir(parsed);
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
