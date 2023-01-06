export interface ORSchema {
}
export interface ORSchemaObject extends ORSchema {
  type: "object";
  properties: {};
  required: string[];
}
export interface ORSchemaArray extends ORSchema {
  type: "array";
  items: {};
}
export interface ORSchemaType extends ORSchema {
  type: string;
}
export interface ORParamSchema {
type?: string;
$ref?: string;
};
export interface ORParam {
name: string;
description: string;
type: string;
required: boolean;
schema?: ORParamSchema;
}
export interface ORMethod {
pallet?: string;
name: string;
params: [];
result?: string;
}

export const typeToOpenRPCType = new Map<string, string>([
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