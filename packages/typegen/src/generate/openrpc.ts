// Copyright 2017-2022 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { TypeRegistry } from '@polkadot/types/create';
import type { Definitions } from '@polkadot/types/types';
import type { ExtraTypes } from './types';

import Handlebars from 'handlebars';

import * as defaultDefinitions from '@polkadot/types/interfaces/definitions';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';

import { createImports, initMeta, readTemplate, writeFile } from '../util';
import { metaTypeToSchemaMap, rpcKeyToOpenRpcMethods, rpcMetadataToJson, extrinsicMetadataToJson } from './openrpc/mappings';
import { ORMethod } from './openrpc/types';
import { Metadata } from '@polkadot/types/metadata/Metadata';

const generateOpenRpcTypesTemplate = Handlebars.compile(readTemplate('openrpc'));

/** @internal */
export function generateOpenRpcTypes(registry: TypeRegistry, metadata: Metadata, importDefinitions: Record<string, Definitions>, dest: string, extraTypes: ExtraTypes): void {

  writeFile(dest, (): string => {
    const allTypes: ExtraTypes = { '@polkadot/types/interfaces': importDefinitions, ...extraTypes };
    const imports = createImports(allTypes);
    const definitions = imports.definitions as Record<string, Definitions>;

    const { lookup, pallets } = metadata.asLatest;

    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context);
    });

    Handlebars.registerHelper('jsonmap', function (context) {
      return JSON.stringify(Object.fromEntries(context), null, 3);
    });

    // get all rpc definitions
    const methods: ORMethod[] = Object
      .keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .map((sectionFullName) => rpcKeyToOpenRpcMethods(sectionFullName, definitions))
      .reduce((acc, el) => acc.concat(el));
    
    const extrinsics = extrinsicMetadataToJson(registry, lookup, pallets);

    return rpcMetadataToJson(methods, metaTypeToSchemaMap, extrinsics, generateOpenRpcTypesTemplate);
  });
}

export function generateDefaultOpenRPC(dest: string, extraTypes: ExtraTypes = {}): void {
  const { registry, metadata } = initMeta(staticSubstrate, extraTypes);

  generateOpenRpcTypes(
    registry,
    metadata,
    defaultDefinitions,
    dest,
    extraTypes
  );
}
