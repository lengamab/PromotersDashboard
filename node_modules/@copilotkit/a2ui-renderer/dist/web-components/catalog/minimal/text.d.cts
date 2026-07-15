import { LitComponentImplementation } from "../../types.cjs";
import "../../index.cjs";
import { z } from "zod";

//#region src/web-components/catalog/minimal/text.d.ts
declare const TextSchema: z.ZodObject<{
  text: z.ZodUnion<[z.ZodString, z.ZodObject<{
    path: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    path: string;
  }, {
    path: string;
  }>, z.ZodObject<{
    call: z.ZodString;
    args: z.ZodRecord<z.ZodString, z.ZodAny>;
    returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
  }, "strip", z.ZodTypeAny, {
    call: string;
    args: Record<string, any>;
    returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
  }, {
    call: string;
    args: Record<string, any>;
    returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
  }>]>;
  variant: z.ZodOptional<z.ZodEnum<["h1", "h2", "h3", "h4", "h5", "caption", "body"]>>;
}, "strip", z.ZodTypeAny, {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "caption" | "body";
  text?: string | {
    path: string;
  } | {
    call: string;
    args: Record<string, any>;
    returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
  };
}, {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "caption" | "body";
  text?: string | {
    path: string;
  } | {
    call: string;
    args: Record<string, any>;
    returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
  };
}>;
declare const TextApiDef: {
  name: string;
  schema: z.ZodObject<{
    text: z.ZodUnion<[z.ZodString, z.ZodObject<{
      path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
      path: string;
    }, {
      path: string;
    }>, z.ZodObject<{
      call: z.ZodString;
      args: z.ZodRecord<z.ZodString, z.ZodAny>;
      returnType: z.ZodDefault<z.ZodEnum<["string", "number", "boolean", "array", "object", "any", "void"]>>;
    }, "strip", z.ZodTypeAny, {
      call: string;
      args: Record<string, any>;
      returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
    }, {
      call: string;
      args: Record<string, any>;
      returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
    }>]>;
    variant: z.ZodOptional<z.ZodEnum<["h1", "h2", "h3", "h4", "h5", "caption", "body"]>>;
  }, "strip", z.ZodTypeAny, {
    variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "caption" | "body";
    text?: string | {
      path: string;
    } | {
      call: string;
      args: Record<string, any>;
      returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
    };
  }, {
    variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "caption" | "body";
    text?: string | {
      path: string;
    } | {
      call: string;
      args: Record<string, any>;
      returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
    };
  }>;
};
declare const Text: LitComponentImplementation;
//#endregion
export { Text, TextApiDef, TextSchema };
//# sourceMappingURL=text.d.cts.map