import { CatalogComponentDefinition, CatalogDefinitions, CatalogRenderers, ComponentRenderer, LitComponentImplementation, RendererProps } from "./types.mjs";
import { Catalog } from "@a2ui/web_core/v0_9";
import { ZodObject, ZodRawShape, z } from "zod";

//#region src/web-components/create-catalog.d.ts
/**
 * Context description used to identify the A2UI component schema in RunAgentInput.context.
 * Must match the constant in @ag-ui/a2ui-middleware so the middleware can overwrite
 * a frontend-provided schema with a server-side one.
 */
declare const A2UI_SCHEMA_CONTEXT_DESCRIPTION = "A2UI Component Schema \u2014 available components for generating UI surfaces. Use these component names and properties when creating A2UI operations.";
declare function createCatalog<D extends CatalogDefinitions>(definitions: D, renderers: CatalogRenderers<D>, options?: {
  catalogId?: string;
  includeBasicCatalog?: boolean;
}): Catalog<LitComponentImplementation>;
declare function extractSchema(definitions: CatalogDefinitions): Array<{
  name: string;
  description?: string;
  props?: Record<string, unknown>;
}>;
interface A2UIComponentDefinition<T extends ZodRawShape = ZodRawShape> {
  props: ZodObject<T>;
  description?: string;
  render: (props: RendererProps<z.infer<ZodObject<T>>>) => unknown;
}
type A2UIComponentMap = Record<string, A2UIComponentDefinition<any>>;
declare function createA2UICatalog(components: A2UIComponentMap, options?: {
  catalogId?: string;
  includeBasicCatalog?: boolean;
}): Catalog<LitComponentImplementation>;
declare function extractA2UISchema(components: A2UIComponentMap): Array<{
  name: string;
  description?: string;
  props?: Record<string, unknown>;
}>;
declare function buildCatalogContextValue(catalog?: unknown): string;
interface InlineCatalogSchema {
  catalogId: string;
  components: Record<string, Record<string, unknown>>;
}
declare function extractCatalogComponentSchemas(catalog?: unknown): InlineCatalogSchema;
//#endregion
export { A2UIComponentDefinition, A2UIComponentMap, A2UI_SCHEMA_CONTEXT_DESCRIPTION, buildCatalogContextValue, createA2UICatalog, createCatalog, extractA2UISchema, extractCatalogComponentSchemas, extractSchema };
//# sourceMappingURL=create-catalog.d.mts.map