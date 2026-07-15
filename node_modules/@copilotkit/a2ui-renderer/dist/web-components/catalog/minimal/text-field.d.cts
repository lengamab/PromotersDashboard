import { LitComponentImplementation } from "../../types.cjs";
import "../../index.cjs";
import { z } from "zod";

//#region src/web-components/catalog/minimal/text-field.d.ts
declare const TextFieldSchema: z.ZodObject<{
  label: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
  value: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
  variant: z.ZodOptional<z.ZodEnum<["longText", "number", "shortText", "obscured"]>>;
  validationRegexp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  value?: string | {
    path: string;
  } | {
    call: string;
    args: Record<string, any>;
    returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
  };
  label?: string | {
    path: string;
  } | {
    call: string;
    args: Record<string, any>;
    returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
  };
  variant?: "number" | "longText" | "shortText" | "obscured";
  validationRegexp?: string;
}, {
  value?: string | {
    path: string;
  } | {
    call: string;
    args: Record<string, any>;
    returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
  };
  label?: string | {
    path: string;
  } | {
    call: string;
    args: Record<string, any>;
    returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
  };
  variant?: "number" | "longText" | "shortText" | "obscured";
  validationRegexp?: string;
}>;
declare const TextFieldApiDef: {
  name: string;
  schema: z.ZodObject<{
    label: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
    value: z.ZodUnion<[z.ZodString, z.ZodObject<{
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
    variant: z.ZodOptional<z.ZodEnum<["longText", "number", "shortText", "obscured"]>>;
    validationRegexp: z.ZodOptional<z.ZodString>;
  }, "strip", z.ZodTypeAny, {
    value?: string | {
      path: string;
    } | {
      call: string;
      args: Record<string, any>;
      returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
    };
    label?: string | {
      path: string;
    } | {
      call: string;
      args: Record<string, any>;
      returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
    };
    variant?: "number" | "longText" | "shortText" | "obscured";
    validationRegexp?: string;
  }, {
    value?: string | {
      path: string;
    } | {
      call: string;
      args: Record<string, any>;
      returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
    };
    label?: string | {
      path: string;
    } | {
      call: string;
      args: Record<string, any>;
      returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
    };
    variant?: "number" | "longText" | "shortText" | "obscured";
    validationRegexp?: string;
  }>;
};
declare const TextField: LitComponentImplementation;
//#endregion
export { TextField, TextFieldApiDef, TextFieldSchema };
//# sourceMappingURL=text-field.d.cts.map