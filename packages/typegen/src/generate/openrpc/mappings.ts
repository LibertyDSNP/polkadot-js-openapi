import { ORSchemaComponent, ORSchemaType, ORSchemaObject, ORSchemaArray, ORMethod, ORParam, ORParamSchema } from "./types";

let metaTypeToSchemaMap = new Map<string, ORSchemaComponent>([
  ["bool", { name: "boolean" } as ORSchemaType],
  ["string", { name: "string" } as ORSchemaType],
  ["u8", { name: "integer" } as ORSchemaType],
  ["u16", { name: "integer" } as ORSchemaType],
  ["u32", { name: "integer" } as ORSchemaType],
  ["u64", { name: "integer" } as ORSchemaType],
  ["u128", { name: "integer" } as ORSchemaType],
  ["i8", { name: "integer" } as ORSchemaType],
  ["i16", { name: "integer" } as ORSchemaType],
  ["i32", { name: "integer" } as ORSchemaType],
  ["i64", { name: "integer" } as ORSchemaType],
  ["i128", { name: "integer" } as ORSchemaType]
]);

export function rpcKeyToOpenRpcMethods(rpcKey: string, definitions: any): ORMethod[] {
  const rpc = definitions[rpcKey].rpc || {};
  const sectionName = rpcKey.split('/').pop() || "";

  return Object.keys(rpc).map((methodName) => {
    let type;
    console.log("\n" + methodName);
    let params: ORParam[] = rpc[methodName].params.map((methodParam: any) => mapParam(methodParam));

    return {
      pallet: sectionName,
      name: methodName,
      params: params,
      result: type
    } as ORMethod;
  });
}

export function rpcMetadataToJson(methods: ORMethod[], schemas: ORSchemaComponent[], template: (options: {methods: ORMethod[], schemas: ORSchemaComponent[]}) => string): string {
  const json = template({ methods, schemas });

  let stringified;
  try {
    const parsed = JSON.parse(json);
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
  console.dir(inputParam);

  let [required, inputParamSchema] = metaTypeToSchema(inputParam.type);
  // Required can be from the Option<type> or from isOptional.
  if (inputParam.isOptional) {
    required = false;
  }
  return {
    name: inputParam.name,
    description: "",
    type: inputParam.type,
    required: required,
    schema: inputParamSchema
  };
}

function metaTypeToSchema(metaType: string): [boolean, ORParamSchema] {
  let schemaComponent:ORSchemaComponent = metaTypeToSchemaMap.get(metaType);
  let required = true;
  if (schemaComponent === undefined) {
    console.log("Type " + metaType + " doesn't exist.  Try to define it.");
    let match;
    let currentMetaType = metaType;
    let wrappedType;

    // Process Option<type>
    match = unwrapType("Option", currentMetaType);
    if (match) {
      console.dir(match);
      let wrappedType = match[1];
      console.log("Unwrapped "+ currentMetaType + " to " + wrappedType);
      required = false;
      currentMetaType = wrappedType;
    }

    // Process Vec<type>
    match = unwrapType("Vec", currentMetaType);
    if (match) {
      wrappedType = match[1];
      console.log("Unwrapped "+ currentMetaType + " to " + wrappedType);

      let array = new ORSchemaArray();
      array.items = {"$ref": "#/components/schemas/" + wrappedType};
      schemaComponent = array;
      metaTypeToSchemaMap.set(metaType, schemaComponent);
      currentMetaType = wrappedType;
    }
    else {
      schemaComponent = new ORSchemaComponent();
      schemaComponent.name = currentMetaType;
    }

    // Process Compact<type>
    match = unwrapType("Compact", currentMetaType);
    if (match) {
      let wrappedType = match[1];
      console.log("Unwrapped "+ currentMetaType + " to " + wrappedType);
      required = false;
      currentMetaType = wrappedType;
    }
  }

  if (schemaComponent instanceof ORSchemaType) {
    return [required, { type: schemaComponent.name }];
  }
  else if (schemaComponent instanceof ORSchemaArray) {
    return [required, {  type: schemaComponent.type, items: schemaComponent.items }];
  }
  else {
    return [required, { $ref: `#/components/schemas/${schemaComponent.name}` }];
  }
}

// Unwrap a type if it is wrapper.  e.g.  Option<u32> is u32, Vec<u8> is u8, etc...
function unwrapType(wrapper: string, aType: string): RegExpMatchArray | null {
  let pattern = `${wrapper}<(.*?)>$`;
  const regex = new RegExp(pattern);
  const match = aType.match(regex);
  return match;
}

// Unwrap a tuple.  e.g. (u32,u32), etc...
function unwrapTuple(aType: string): RegExpMatchArray | null {
  const regex =  /\(([^)]+)\)/;

  const match = aType.match(regex);
  return match;
}

// Unwrap an array.  e.g. [u8; 8], etc...
function unwrapArray(aType: string): RegExpMatchArray | null {
  const regex = /\[([^\]]+)\]/;

  const match = aType.match(regex);
  return match;
}
