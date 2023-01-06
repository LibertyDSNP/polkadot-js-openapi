import { ORMethod, ORParam, ORParamSchema, typeToOpenRPCType } from "./types";

export function rpcKeyToRpcMethods(rpcKey: string, definitions: any): ORMethod[] {
  const rpc = definitions[rpcKey].rpc || {};
  const sectionName = rpcKey.split('/').pop() || "";

  return Object.keys(rpc).sort().map((methodName) => {
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

export function transformMethodsToJson(methods: ORMethod[], template: any): string {
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
export function mapParam(inputParam: any): ORParam {
    let param: ORParam = {
      name: inputParam.name,
      description: "",
      type: inputParam.type,
      required: inputParam.isOptional ?? true,
      schema: {} as ORParamSchema
    };
  
    let stype = typeToOpenRPCType.get(inputParam.type);
  
    let schema: ORParamSchema;
    if (stype !== undefined) {
      schema = {
        type: stype
      }
    }
    else {
      schema = {
        $ref: "#/components/schema/" + inputParam.type
      }
    }
    param.schema = schema;
    return param;
  }