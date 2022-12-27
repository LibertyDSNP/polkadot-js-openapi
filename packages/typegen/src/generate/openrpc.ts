// Copyright 2017-2022 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from '@polkadot/types/metadata/Metadata';
import type { Definitions, Registry } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from './types';

import Handlebars from 'handlebars';

import * as defaultDefs from '@polkadot/types/interfaces/definitions';
import { Text } from '@polkadot/types/primitive';
import lookupDefinitions from '@polkadot/types-augment/lookup/definitions';
import { stringCamelCase } from '@polkadot/util';

import { compareName, formatType, initMeta, readTemplate, writeFile } from '../util';

const MAPPED_NAMES: Record<string, string> = {
  class: 'clazz',
  new: 'updated'
};

const generateForMetaTemplate = Handlebars.compile(readTemplate('openrpc'));

function mapName (_name: Text): string {
  const name = stringCamelCase(_name);

  return MAPPED_NAMES[name] || name;
}

const typeToOpenRPCType = new Map<string, Object>([
  ["string", {"type": "string"}],
  ["Bytes", {"$ref": "#/components/schemas/Bytes"}],
  ["u8", {"type": "number"}],
  ["u16", {"type": "number"}],
  ["u32", {"type": "number"}],
  ["u64", {"type": "number"}],
  ["u128", {"type": "number"}],
  ["i8", {"type": "number"}],
  ["i16", {"type": "number"}],
  ["i32", {"type": "number"}],
  ["i64", {"type": "number"}],
  ["i128", {"type": "number"}],
  ["Compact<u8>", {"type": "number"}],
  ["Compact<u16>", {"type": "number"}],
  ["Compact<u32>", {"type": "number"}],
  ["Compact<u64>", {"type": "number"}],
  ["Compact<u128>", {"type": "number"}],
  ["Compact<i8>", {"type": "number"}],
  ["Compact<i16>", {"type": "number"}],
  ["Compact<i32>", {"type": "number"}],
  ["Compact<i64>", {"type": "number"}],
  ["Compact<i128>", {"type": "number"}],
  ["Compact<Weight>", {"type": "number"}]
]);

// function convertTypeToRPCType(aType: string): SchemaObject {
//   let theType:string;
//   let required: boolean = true;

//   const matchVec = aType.match(/Vec<(.*?)>/);  // arrays/vectors
//   const matchOption = aType.match(/Option<(.*?)>/); // optional
//   if (matchOption) {
//     theType = matchOption[1];
//     required = false;
//   }
//   else {
//     theType = aType;
//   }

//   let rpcTypeObj = typeToOpenRPCType.get(theType);
//   if (rpcTypeObj == undefined) {
//     rpcTypeObj = {"type": "null"};
//   }

//   return rpcTypeObj;
// }

/** @internal */
function generateForMeta (registry: Registry, meta: Metadata, dest: string, extraTypes: ExtraTypes, isStrict: boolean, customLookupDefinitions?: Definitions): void {
    writeFile(dest, (): string => {

    const allTypes: ExtraTypes = {
      '@polkadot/types-augment': {
        lookup: {
          ...lookupDefinitions,
          ...customLookupDefinitions
        }
      },
      '@polkadot/types/interfaces': defaultDefs,
      ...extraTypes
    };

    const allDefs = Object.entries(allTypes).reduce((defs, [path, obj]) => {
      return Object.entries(obj).reduce((defs, [key, value]) => ({ ...defs, [`${path}/${key}`]: value }), defs);
    }, {});


    let allMethods: Object[] = [];

    const { lookup, pallets } = meta.asLatest;
    pallets
      .sort(compareName)
      .filter(({ calls }) => calls.isSome)
      .map(({ calls, name }) => {
        const sectionName = stringCamelCase(name);
        // console.log("sectionName=" + sectionName);
        const items = lookup.getSiType(calls.unwrap().type).def.asVariant.variants
          .map(({ docs, fields, name }) => {
            console.log("docs=" + docs);

            const typesInfo = fields.map(({ name, type, typeName }, index): [string, string, string] => {
              const typeDef = registry.lookup.getTypeDef(type);

              return [
                name.isSome
                  ? mapName(name.unwrap())
                  : `param${index}`,
                typeName.isSome
                  ? typeName.toString()
                  : typeDef.type,
                typeDef.isFromSi
                  ? typeDef.type
                  : typeDef.lookupName || typeDef.type
              ];
            });

              const params = typesInfo
              .map(([name,, typeStr]) => {
                console.log("name:"+ name + " typeStr:" + typeStr);

                let schemaObj = typeToOpenRPCType.get(typeStr);
                if (schemaObj == undefined) {
                  schemaObj = {};
                }

                console.dir(schemaObj);

                let required: boolean = true;
                const param = {
                  name: name,
                  required: required,
                  type: JSON.stringify(schemaObj, null, 1)
                };
               return param;
              });

            return {
              docs,
              name: stringCamelCase(name),
              params
            };
          })
          .sort(compareName);

        for (const item of items) {
          allMethods.push({ palletName: sectionName, method: item });
        }
      })


    let json = generateForMetaTemplate({
      allMethods
    });

    let parsed = JSON.parse(json);
    //console.dir(parsed);
    json = JSON.stringify(parsed, null, 2);
    return json;
  });
}

// Call `generateForMeta()` with current static metadata
/** @internal */
export function generateDefaultOpenRPC (dest: string, data: HexString, extraTypes: ExtraTypes = {}, isStrict = false, customLookupDefinitions?: Definitions): void {
  const { metadata, registry } = initMeta(data, extraTypes);

  return generateForMeta(registry, metadata, dest, extraTypes, isStrict, customLookupDefinitions);
}
