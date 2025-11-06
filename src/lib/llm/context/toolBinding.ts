import { Tool } from "ollama";

export type JsonSchemaTypeOf<T>
  = T extends string ? "string"
  : T extends number ? "number"
  : T extends boolean ? "boolean"
  : T extends any[] ? "array"
  : T extends object ? "object"
  : "string";

type KeyOf<T> = Extract<keyof T, string>;

export type ToolFor<TParams extends Record<string, any> = {}>
  = Omit<Tool, "function"> & {
    function: Omit<Tool["function"], "parameters"> & {
      parameters?: {
        type?: string;
        $defs?: any;
        items?: any;
        required?: KeyOf<TParams>[];
        properties: {
          [K in KeyOf<TParams>]: {
            type?: JsonSchemaTypeOf<TParams[K]> | JsonSchemaTypeOf<TParams[K]>[];
            items?: any;
            description?: string;
            enum?: any[];
          }
        };
      };
    };
  };

type FNType<TParams extends Record<string, any>> = (input: TParams) => Promise<any> | any;

export class ToolBinding<TParams extends Record<string, any>, TTool extends ToolFor<TParams>> {
  readonly tool: TTool;
  readonly fn: FNType<TParams>;

  constructor(tool: TTool, fn: FNType<TParams>) {
    this.tool = tool;
    this.fn = fn;
  }
}

export type ToolBindingRecord = Record<string, ToolBinding<any, any>>;
