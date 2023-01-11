import { PortableRegistry, TypeRegistry, Vec } from "@polkadot/types";
import { ORSchemaComponent, ORSchemaType, ORSchemaArray, ORMethod, ORParam, ORParamSchema } from "./types";
import { PalletMetadataV14 } from "@polkadot/types/interfaces";
import { compareName } from "../../util";
import { stringCamelCase } from "@polkadot/util";
import { Text } from '@polkadot/types/primitive';

const MAPPED_NAMES: Record<string, string> = {
  class: 'clazz',
  new: 'updated'
};

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

export function rpcMetadataToJson(methods: ORMethod[], schemas: Map<string, ORSchemaComponent>, extrinsics: object[], template: (options: { methods: ORMethod[], schemas: Map<string, ORSchemaComponent>, extrinsics: object[] }) => string): string {
  var mapAsc = new Map<string, ORSchemaComponent>([...metaTypeToSchemaMap.entries()].sort(
    function ([key1, _val1], [key2, _val2]) {
      return key1.toLowerCase().localeCompare(key2.toLowerCase());
    }
  ));

  const json = template({ methods, extrinsics, schemas: mapAsc });
  console.log(json);

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

export function extrinsicMetadataToJson(registry: TypeRegistry, lookup: PortableRegistry, pallets: Vec<PalletMetadataV14>) {
  const allMethods: object[] = [];

  pallets
    .sort(compareName)
    .filter(({ calls }) => calls.isSome)
    .map(({ calls, name }) => {
      const sectionName = stringCamelCase(name);
      const items = lookup.getSiType(calls.unwrap().type).def.asVariant.variants
        .map(({ docs, fields, name }) => {

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
                let itemSchema = metaTypeToSchemaMap.get(theType);
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
                  let vtype = metaTypeToSchemaMap.get(v);
                  items.push(vtype);
                }
              }

              let schemaObj = metaTypeToSchemaMap.get(typeStr);

              if (schemaObj === undefined) {
                schemaObj = new ORSchemaComponent();
                schemaObj.name = typeStr;
              }
              if (typeStr == "array") {
                schemaObj = Object.assign({}, schemaObj, { items: items });
              }

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
        let description: string = "";
        if (item.docs === undefined) {
          description = "";
        }
        else {
          let first:boolean = true;
          for (const line of item.docs) {
            description = description + sanitize(line.toString());
            if (first == true) {
              first = false;
            }
            else {
              description += ' ';
            }
          }
        }
        allMethods.push({ method: item, palletName: sectionName, description: description});
      }
    });

  return allMethods;
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

function mapName (_name: Text): string {
  const name = stringCamelCase(_name);

  return MAPPED_NAMES[name] || name;
}

function sanitize(comment: string): string {
  let sanitized = "";

  for (const c of comment) {
    if (c.match(/[a-zA-Z0-9., #:;\[_%\]\/*->&'"`~<^$)(@!]/i)) {
      sanitized += c;
    }
    else {
      sanitized += ' ';
    }
  }

  // if (comment != sanitized) {
  //   console.log("BEFORE: |" + comment);
  //   console.log("AFTER:  |" + sanitized);
  // }
  return sanitized;
}