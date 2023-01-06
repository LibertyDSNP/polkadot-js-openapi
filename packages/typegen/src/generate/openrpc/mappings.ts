import { ORMethod, ORParam, ORParamSchema, typeToOpenRPCType } from "./types";

export function rpcKeyToRpcMethods(rpcKey: string, definitions: any): ORMethod[] {
  const rpc = definitions[rpcKey].rpc || {};
  const sectionName = rpcKey.split('/').pop() || "";

  return Object.keys(rpc).map((methodName) => {
    let type;
    let params: ORParam[] = rpc[methodName].params.map((methodParam: any) => mapParam(methodParam));

    return {
      pallet: sectionName,
      name: methodName,
      params: params,
      result: type
    } as ORMethod;
  });
}

export function rpcMethodsToJson(methods: ORMethod[], template: (options: {methods: ORMethod[]}) => string): string {
  let json = template({ methods });

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
}

/** @internal */
export function mapParam(inputParam: {name: string, type: string, isOptional?: boolean}): ORParam {
  return {
    name: inputParam.name,
    description: "",
    type: inputParam.type,
    required: inputParam.isOptional ?? true,
    schema: paramTypeToSchema(inputParam.type)
  };
}

function paramTypeToSchema(type: string): ORParamSchema {
  let standardizedRpcType = typeToOpenRPCType.get(type);
  return standardizedRpcType !== undefined ? { type: standardizedRpcType } : { $ref: `#/components/schema/${type}` }
}