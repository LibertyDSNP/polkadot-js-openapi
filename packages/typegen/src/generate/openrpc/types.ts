export interface ORObject {
type: "object";
properties: {};
required: string[];
}

export interface ORArray {
type: "array";
items: {};
}

export interface ORType {
type: string;
}
export interface ORSchema {
type?: string;
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