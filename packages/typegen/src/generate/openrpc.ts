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

/** @internal */
export function generateRpcTypes(registry: TypeRegistry, importDefinitions: Record<string, Definitions>, dest: string, extraTypes: ExtraTypes): void {
  writeFile(dest, (): string => {
    const allTypes: ExtraTypes = { '@polkadot/types/interfaces': importDefinitions, ...extraTypes };
    const imports = createImports(allTypes);
    const definitions = imports.definitions as Record<string, Definitions>;

    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context);
    });

    const rpcKeys = Object
      .keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .sort();

    const allRPCMethods: object[] = [];

    const modules = rpcKeys.map((sectionFullName) => {
      const rpc = definitions[sectionFullName].rpc || {};
      const section = sectionFullName.split('/').pop();

      const allMethods = Object.keys(rpc).sort().map((methodName) => {
        const def = rpc[methodName];

        let type;
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
