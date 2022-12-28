// Copyright 2017-2022 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Metadata } from '@polkadot/types/metadata/Metadata';
import type { Definitions, Registry } from '@polkadot/types/types';
import type { HexString } from '@polkadot/util/types';
import type { ExtraTypes } from './types';

import Handlebars from 'handlebars';

import { Text } from '@polkadot/types/primitive';
import { stringCamelCase } from '@polkadot/util';

import { compareName, initMeta, readTemplate, writeFile } from '../util';

const MAPPED_NAMES: Record<string, string> = {
  class: 'clazz',
  new: 'updated'
};

const generateForMetaTemplate = Handlebars.compile(readTemplate('openrpc'));

function mapName (_name: Text): string {
  const name = stringCamelCase(_name);

  return MAPPED_NAMES[name] || name;
}

const typeToOpenRPCType = new Map<string, object>([
  ['string', { type: 'string' }],
  ['AccountId32', { $ref: '#/components/schemas/AccountId32' }],
  ['Bytes', { $ref: '#/components/schemas/Bytes' }],
  ['Call', { $ref: '#/components/schemas/Call' }],
  ['CommonPrimitivesSchemaModelType', { $ref: '#/components/schemas/CommonPrimitivesSchemaModelType' }],
  ['CommonPrimitivesSchemaPayloadLocation', { $ref: '#/components/schemas/CommonPrimitivesSchemaPayloadLocation' }],
  ['CumulusPrimitivesParachainInherentParachainInherentData', { $ref: '#/components/schemas/CumulusPrimitivesParachainInherentParachainInherentData' }],
  ['H256', { $ref: '#/components/schemas/H256' }],
  ['FrameSupportScheduleMaybeHashed', { $ref: '#/components/schemas/FrameSupportScheduleMaybeHashed' }],
  ['FrequencyRuntimeOriginCaller', { $ref: '#/components/schemas/FrequencyRuntimeOriginCaller' }],
  ['FrequencyRuntimeSessionKeys', { $ref: '#/components/schemas/FrequencyRuntimeSessionKeys' }],
  ['MultiAddress', { $ref: '#/components/schemas/MultiAddress' }],
  ['OrmlVestingVestingSchedule', { $ref: '#/components/schemas/OrmlVestingVestingSchedule' }],
  ['PalletDemocracyConviction', { $ref: '#/components/schemas/PalletDemocracyConviction' }],
  ['PalletDemocracyVoteAccountVote', { $ref: '#/components/schemas/PalletDemocracyVoteAccountVote' }],
  ['PalletMsaAddKeyData', { $ref: '#/components/schemas/PalletMsaAddKeyData' }],
  ['PalletMsaAddProvider', { $ref: '#/components/schemas/PalletMsaAddProvider' }],
  ['SpRuntimeHeader', { $ref: '#/components/schemas/SpRuntimeHeader' }],
  ['SpRuntimeMultiSignature', { $ref: '#/components/schemas/SpRuntimeMultiSignature' }],
  ['u8', { type: 'number' }],
  ['u16', { type: 'number' }],
  ['u32', { type: 'number' }],
  ['u64', { type: 'number' }],
  ['u128', { type: 'number' }],
  ['i8', { type: 'number' }],
  ['i16', { type: 'number' }],
  ['i32', { type: 'number' }],
  ['i64', { type: 'number' }],
  ['i128', { type: 'number' }],
  ['Weight', { type: 'number' }]
]);

// Unwrap a type if it is wrapper.  e.g.  Option<u32> is u32, Vec<u8> is u8, etc...
function unwrapType(wrapper: string, aType: string): RegExpMatchArray | null {
  let pattern = `${wrapper}<(.*?)>`;
  let regex = new RegExp(pattern);
  const match = aType.match(regex);
  return match;
}

// Unwrap a tuple.  e.g. (u32,u32), etc...
function unwrapTuple(aType: string): RegExpMatchArray | null {
  const regex =  /\(([^)]+)\)/;

  const match = aType.match(regex);
  return match;
}

/** @internal */
function generateForMeta (registry: Registry, meta: Metadata, dest: string, extraTypes: ExtraTypes, isStrict: boolean, customLookupDefinitions?: Definitions): void {
  writeFile(dest, (): string => {
    const allMethods: object[] = [];

    const { lookup, pallets } = meta.asLatest;

    pallets
      .sort(compareName)
      .filter(({ calls }) => calls.isSome)
      .map(({ calls, name }) => {
        const sectionName = stringCamelCase(name);
        // console.log("sectionName=" + sectionName);
        const items = lookup.getSiType(calls.unwrap().type).def.asVariant.variants
          .map(({ docs, fields, name }) => {
            // console.log("docs=" + docs);

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
              .map(([name, , typeStr]) => {
                // console.log('name:' + name + ' typeStr:' + typeStr);

                let match;

                // Process Option<type>
                let required = true;
                match = unwrapType('Option', typeStr);
                if (match) {
                  let theType = match[1];
                  required = false;
                  console.log("Unwrapped "+ typeStr + " to " + theType);
                  typeStr = theType;
                }

                // Process Compact<type>
                match = unwrapType('Compact', typeStr);
                if (match) {
                  let theType = match[1];
                  console.log("Unwrapped "+ typeStr + " to " + theType);
                  typeStr = theType;
                }

                // Process Vec<type>
                let items;
                match = unwrapType('Vec', typeStr);
                if (match) {
                  let theType = match[1];
                  console.log("Unwrapped "+ typeStr + " to " + theType);
                  typeStr = "array";
                  // All array elements are the same type
                  let itemSchema = typeToOpenRPCType.get(theType);
                  items = itemSchema;
                }

                // Process tuple e.g. (u32,u32)
                match = unwrapTuple(typeStr);
                if (match) {
                  const values = match[1].split(",");
                  console.log(`Matched tuple ${typeStr} with ${values.length} values: ${match[0]}`);
                  console.log(`Values: ${values}`);
                  typeStr = "array";
                  items = [];
                  for (const v of values) {
                    items.push({ type: v});
                  }

                }

                let schemaObj = typeToOpenRPCType.get(typeStr);

                if (schemaObj === undefined) {
                  schemaObj = { type: typeStr };
                }
                if (typeStr == "array") {
                  schemaObj = Object.assign({}, schemaObj, { items: items });
                  // console.log("items=" + items);
                }

                console.dir(schemaObj);

                const param = {
                  name,
                  required,
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
          allMethods.push({ method: item, palletName: sectionName });
        }
      });

    let json = generateForMetaTemplate({
      allMethods
    });

    const parsed = JSON.parse(json);

    // console.dir(parsed);
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
