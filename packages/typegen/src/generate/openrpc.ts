// Copyright 2017-2022 @polkadot/typegen authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { TypeRegistry } from '@polkadot/types/create';
import type { Definitions } from '@polkadot/types/types';
import type { ExtraTypes } from './types';

import Handlebars from 'handlebars';

import * as defaultDefinitions from '@polkadot/types/interfaces/definitions';
import staticSubstrate from '@polkadot/types-support/metadata/static-substrate';

import { createImports, initMeta, readTemplate, writeFile } from '../util';
import { rpcKeyToOpenRpcSchemas, rpcKeyToOpenRpcMethods, rpcMetadataToJson } from './openrpc/mappings';
import { ORMethod, ORSchema } from './openrpc/types';

const generateOpenRpcTypesTemplate = Handlebars.compile(readTemplate('openrpc'));

/** @internal */
export function generateOpenRpcTypes(registry: TypeRegistry, importDefinitions: Record<string, Definitions>, dest: string, extraTypes: ExtraTypes): void {

  writeFile(dest, (): string => {
    const allTypes: ExtraTypes = { '@polkadot/types/interfaces': importDefinitions, ...extraTypes };
    const imports = createImports(allTypes);
    const definitions = imports.definitions as Record<string, Definitions>;

    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context);
    });

    // get all rpc definitions
    const methods: ORMethod[] = Object
      .keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .map((sectionFullName) => rpcKeyToOpenRpcMethods(sectionFullName, definitions))
      .reduce((acc, el) => acc.concat(el));

      const schemas: ORSchema[] = Object
      .keys(definitions)
      .filter((key) => Object.keys(definitions[key].rpc || {}).length !== 0)
      .map((sectionFullName) => rpcKeyToOpenRpcSchemas(sectionFullName, definitions))
      .reduce((acc, el) => acc.concat(el));

    return rpcMetadataToJson(methods, schemas, generateOpenRpcTypesTemplate);
  });
}

export function generateDefaultOpenRPC(dest: string, extraTypes: ExtraTypes = {}): void {
  const { registry } = initMeta(staticSubstrate, extraTypes);

  generateOpenRpcTypes(
    registry,
    defaultDefinitions,
    dest,
    extraTypes
  );
}
