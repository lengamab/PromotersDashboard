import { LitComponentImplementation } from "../../types.mjs";
import "../../index.mjs";
import { z } from "zod";

//#region src/web-components/catalog/minimal/button.d.ts
declare const ButtonSchema: z.ZodObject<{
  child: z.ZodString;
  action: z.ZodUnion<[z.ZodObject<{
    event: z.ZodObject<{
      name: z.ZodString;
      context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodAny, "many">, z.ZodObject<{
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
      }>]>>>;
    }, "strip", z.ZodTypeAny, {
      name: string;
      context?: Record<string, string | number | boolean | any[] | {
        path: string;
      } | {
        call: string;
        args: Record<string, any>;
        returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
      }> | undefined;
    }, {
      name: string;
      context?: Record<string, string | number | boolean | any[] | {
        path: string;
      } | {
        call: string;
        args: Record<string, any>;
        returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
      }> | undefined;
    }>;
  }, "strip", z.ZodTypeAny, {
    event: {
      name: string;
      context?: Record<string, string | number | boolean | any[] | {
        path: string;
      } | {
        call: string;
        args: Record<string, any>;
        returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
      }> | undefined;
    };
  }, {
    event: {
      name: string;
      context?: Record<string, string | number | boolean | any[] | {
        path: string;
      } | {
        call: string;
        args: Record<string, any>;
        returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
      }> | undefined;
    };
  }>, z.ZodObject<{
    functionCall: z.ZodObject<{
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
    }>;
  }, "strip", z.ZodTypeAny, {
    functionCall: {
      call: string;
      args: Record<string, any>;
      returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
    };
  }, {
    functionCall: {
      call: string;
      args: Record<string, any>;
      returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
    };
  }>]>;
  variant: z.ZodOptional<z.ZodEnum<["primary", "borderless"]>>;
}, "strip", z.ZodTypeAny, {
  variant?: "primary" | "borderless";
  child?: string;
  action?: {
    event: {
      name: string;
      context?: Record<string, string | number | boolean | any[] | {
        path: string;
      } | {
        call: string;
        args: Record<string, any>;
        returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
      }> | undefined;
    };
  } | {
    functionCall: {
      call: string;
      args: Record<string, any>;
      returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
    };
  };
}, {
  variant?: "primary" | "borderless";
  child?: string;
  action?: {
    event: {
      name: string;
      context?: Record<string, string | number | boolean | any[] | {
        path: string;
      } | {
        call: string;
        args: Record<string, any>;
        returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
      }> | undefined;
    };
  } | {
    functionCall: {
      call: string;
      args: Record<string, any>;
      returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
    };
  };
}>;
declare const ButtonApiDef: {
  name: string;
  schema: z.ZodObject<{
    child: z.ZodString;
    action: z.ZodUnion<[z.ZodObject<{
      event: z.ZodObject<{
        name: z.ZodString;
        context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodAny, "many">, z.ZodObject<{
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
        }>]>>>;
      }, "strip", z.ZodTypeAny, {
        name: string;
        context?: Record<string, string | number | boolean | any[] | {
          path: string;
        } | {
          call: string;
          args: Record<string, any>;
          returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }> | undefined;
      }, {
        name: string;
        context?: Record<string, string | number | boolean | any[] | {
          path: string;
        } | {
          call: string;
          args: Record<string, any>;
          returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }> | undefined;
      }>;
    }, "strip", z.ZodTypeAny, {
      event: {
        name: string;
        context?: Record<string, string | number | boolean | any[] | {
          path: string;
        } | {
          call: string;
          args: Record<string, any>;
          returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }> | undefined;
      };
    }, {
      event: {
        name: string;
        context?: Record<string, string | number | boolean | any[] | {
          path: string;
        } | {
          call: string;
          args: Record<string, any>;
          returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }> | undefined;
      };
    }>, z.ZodObject<{
      functionCall: z.ZodObject<{
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
      }>;
    }, "strip", z.ZodTypeAny, {
      functionCall: {
        call: string;
        args: Record<string, any>;
        returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
      };
    }, {
      functionCall: {
        call: string;
        args: Record<string, any>;
        returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
      };
    }>]>;
    variant: z.ZodOptional<z.ZodEnum<["primary", "borderless"]>>;
  }, "strip", z.ZodTypeAny, {
    variant?: "primary" | "borderless";
    child?: string;
    action?: {
      event: {
        name: string;
        context?: Record<string, string | number | boolean | any[] | {
          path: string;
        } | {
          call: string;
          args: Record<string, any>;
          returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
        }> | undefined;
      };
    } | {
      functionCall: {
        call: string;
        args: Record<string, any>;
        returnType: "string" | "number" | "boolean" | "object" | "array" | "void" | "any";
      };
    };
  }, {
    variant?: "primary" | "borderless";
    child?: string;
    action?: {
      event: {
        name: string;
        context?: Record<string, string | number | boolean | any[] | {
          path: string;
        } | {
          call: string;
          args: Record<string, any>;
          returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
        }> | undefined;
      };
    } | {
      functionCall: {
        call: string;
        args: Record<string, any>;
        returnType?: "string" | "number" | "boolean" | "object" | "array" | "void" | "any" | undefined;
      };
    };
  }>;
};
declare const Button: LitComponentImplementation;
//#endregion
export { Button, ButtonApiDef, ButtonSchema };
//# sourceMappingURL=button.d.mts.map