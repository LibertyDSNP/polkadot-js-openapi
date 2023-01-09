export class ORSchemaComponent {
    name: string;
}
export class ORSchemaObject extends ORSchemaComponent {
    type: string;
    properties: {};
    required: string[];

    constructor() {
        super();
        this.type = "object";
    };
}
export class ORSchemaArray extends ORSchemaComponent {
    type: string;
    items: {};

    constructor() {
        super();
        this.type = "array";
    };
}
export class ORSchemaType extends ORSchemaComponent {
    type: string;
}
export interface ORParamSchema {
    type?: string;
    $ref?: string;
    items?: {};
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
