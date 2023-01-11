import { ORSchemaComponent, ORSchemaType, ORSchemaArray, ORMethod, ORParam, ORParamSchema } from "./types";

export let metaTypeToSchemaMap = new Map<string, ORSchemaComponent>([
  ["bool", new ORSchemaType("boolean","boolean") ],
  ["string", new ORSchemaType("string", "string") ],
  ["u8", new ORSchemaType("u8", "integer") ],
  ["u16", new ORSchemaType("u16", "integer") ],
  ["u32", new ORSchemaType("u32", "integer") ],
  ["u64", new ORSchemaType("u64", "integer") ],
  ["u128", new ORSchemaType("u128", "integer") ],
  ["i8", new ORSchemaType("i8", "integer") ],
  ["i16", new ORSchemaType("i16", "integer") ],
  ["i32", new ORSchemaType("i32", "integer") ],
  ["i64", new ORSchemaType("i64", "integer") ],
  ["i128", new ORSchemaType("i128", "integer") ],
  ["f32", new ORSchemaType("f32", "number") ],
  ["f64", new ORSchemaType("f64", "number") ],
  ["Bytes", new ORSchemaArray("Bytes", {"$ref": "#/components/schemas/u8"})],
  ["Text", new ORSchemaType("string","string")]
]);

export function rpcKeyToOpenRpcMethods(rpcKey: string, definitions: any): ORMethod[] {
  const rpc = definitions[rpcKey].rpc || {};
  const sectionName = rpcKey.split('/').pop() || "";

  return Object.keys(rpc).map((methodName) => {
    let type;
    console.log("\n" + methodName);
    let params: ORParam[] = rpc[methodName].params.map((methodParam: any) => mapParam(methodParam));
    const tags = [{ "name": "rpc" }];
    return {
      pallet: sectionName,
      name: methodName,
      params: params,
      tags: tags,
      result: type
    } as ORMethod;
  });
}

export function rpcMetadataToJson(methods: ORMethod[], schemas: Map<string, ORSchemaComponent>, template: (options: { methods: ORMethod[], schemas: Map<string, ORSchemaComponent> }) => string): string {
  var mapAsc = new Map<string, ORSchemaComponent>([...metaTypeToSchemaMap.entries()].sort(
    function (a, b) {
      return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
    }
  ));

  const json = template({ methods, schemas: mapAsc });

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
export function mapParam(inputParam: { name: string, type: string, isOptional?: boolean }): ORParam {
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
  let schemaComponent: ORSchemaComponent | undefined = metaTypeToSchemaMap.get(metaType);
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
      console.log("Unwrapped " + currentMetaType + " to " + wrappedType);
      required = false;
      currentMetaType = wrappedType;
    }

    // Process Vec<type>
    match = unwrapType("Vec", currentMetaType);
    if (match) {
      wrappedType = match[1];
      console.log("Unwrapped " + currentMetaType + " to " + wrappedType);

      let array = new ORSchemaArray("", { "$ref": "#/components/schemas/" + wrappedType });
      schemaComponent = array;
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
      console.log("Unwrapped " + currentMetaType + " to " + wrappedType);
      required = false;
      currentMetaType = wrappedType;
    }

    // Add the processed component to schema components map
    metaTypeToSchemaMap.set(metaType, schemaComponent);
  }

  // Return the ORParamSchema for use in the params for ORMethod
  // console.log("schemaComponent=");
  // console.dir(schemaComponent);
  if (schemaComponent instanceof ORSchemaType) {
    console.log("schemaComponent.name=" + schemaComponent.name);
    if (schemaComponent.name == "string" || schemaComponent.name == "bool") {
     return [required, { type: schemaComponent.name }];
    }
    return [required, { $ref: `#/components/schemas/${schemaComponent.name}` }];
  }
  else if (schemaComponent instanceof ORSchemaArray) {
    if (schemaComponent.name != "") {
      return [required, { $ref: `#/components/schemas/${schemaComponent.name}` }];
    }
    return [required, { type: schemaComponent.type, items: schemaComponent.items }];
  }
  return [required, { $ref: `#/components/schemas/${schemaComponent.name}` }];
}

// Unwrap a type if it is wrapper.  e.g.  Option<u32> is u32, Vec<u8> is u8, etc...
function unwrapType(wrapper: string, aType: string): RegExpMatchArray | null {
  let pattern = `${wrapper}<(.*?)>$`;
  const regex = new RegExp(pattern);
  const match = aType.match(regex);
  return match;
}

// // Unwrap a tuple.  e.g. (u32,u32), etc...
// function unwrapTuple(aType: string): RegExpMatchArray | null {
//   const regex = /\(([^)]+)\)/;

//   const match = aType.match(regex);
//   return match;
// }

// // Unwrap an array.  e.g. [u8; 8], etc...
// function unwrapArray(aType: string): RegExpMatchArray | null {
//   const regex = /\[([^\]]+)\]/;

//   const match = aType.match(regex);
//   return match;
// }
