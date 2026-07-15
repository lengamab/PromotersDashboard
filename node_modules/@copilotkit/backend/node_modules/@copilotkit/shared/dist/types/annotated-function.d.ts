interface AnnotatedFunctionSimpleArgument {
    name: string;
    type: "string" | "number" | "boolean" | "object";
    description: string;
    required: boolean;
}
interface AnnotatedFunctionArrayArgument {
    name: string;
    type: "array";
    items: {
        type: string;
    };
    description: string;
    required: boolean;
}
type AnnotatedFunctionArgument = AnnotatedFunctionSimpleArgument | AnnotatedFunctionArrayArgument;
interface AnnotatedFunction<Inputs extends any[]> {
    name: string;
    description: string;
    argumentAnnotations: AnnotatedFunctionArgument[];
    implementation: (...args: Inputs) => Promise<any>;
}

export { AnnotatedFunction, AnnotatedFunctionArgument, AnnotatedFunctionArrayArgument, AnnotatedFunctionSimpleArgument };
