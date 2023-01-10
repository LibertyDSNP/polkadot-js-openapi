export class ORSchemaComponent {
    name: string;

    constructor() {
        this.name = "";
    }
}
export class ORSchemaObject extends ORSchemaComponent {
    type: string;
    properties: {};
    required: string[];

    constructor() {
        super();
        this.type = "object";
        this.properties = {};
        this.required = [];
    };
}
export class ORSchemaArray extends ORSchemaComponent {
    type: string;
    items: {};

    constructor() {
        super();
        this.type = "array";
        this.items = {};
    };
}
export class ORSchemaType extends ORSchemaComponent {
    type: string;

    constructor() {
        super();
        this.type = "";
    }
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
    tags: [];
    result?: string;
}
