import { TemplateResult } from "lit";
import { ComponentApi, ComponentContext, InferredComponentApiSchemaType, ResolveA2uiProps, SurfaceModel } from "@a2ui/web_core/v0_9";
import { ZodObject, ZodRawShape, z } from "zod";

//#region src/web-components/types.d.ts
type LitRenderable = TemplateResult | Node | string | number | boolean | null | undefined | LitRenderable[];
interface LitComponentImplementation extends ComponentApi {
  render: (context: ComponentContext, buildChild: (id: string, basePath?: string) => LitRenderable) => LitRenderable;
}
interface LitA2UIComponentProps<T, S = void> {
  props: T;
  buildChild: (id: string, basePath?: string) => LitRenderable;
  context: ComponentContext;
  state: S;
  requestUpdate: () => void;
}
type LitRendererFn<Api extends ComponentApi, S = void> = (componentProps: LitA2UIComponentProps<ResolveA2uiProps<InferredComponentApiSchemaType<Api>>, S>) => LitRenderable;
interface RendererProps<T = Record<string, unknown>> {
  props: T;
  children: (id: string, basePath?: string) => LitRenderable;
  dispatch?: (action: unknown) => void;
}
type ComponentRenderer<T = Record<string, unknown>> = (props: RendererProps<T>) => LitRenderable;
interface CatalogComponentDefinition<T extends ZodRawShape = ZodRawShape> {
  props: ZodObject<T>;
  description?: string;
}
type CatalogDefinitions = Record<string, CatalogComponentDefinition<any>>;
type PropsOf<D extends CatalogDefinitions, K extends keyof D> = z.infer<D[K]["props"]>;
type CatalogRenderers<D extends CatalogDefinitions> = { [K in keyof D]: ComponentRenderer<z.infer<D[K]["props"]>> };
interface A2UISurfaceElement extends HTMLElement {
  operations: unknown[];
  catalog?: unknown;
  theme?: Record<string, unknown>;
  surfaceId?: string;
  loadingComponent?: unknown;
}
interface A2UINodeElement extends HTMLElement {
  surface?: SurfaceModel<LitComponentImplementation>;
  componentId?: string;
  basePath?: string;
}
//#endregion
export { A2UINodeElement, A2UISurfaceElement, CatalogComponentDefinition, CatalogDefinitions, CatalogRenderers, ComponentRenderer, LitA2UIComponentProps, LitComponentImplementation, LitRenderable, LitRendererFn, PropsOf, RendererProps };
//# sourceMappingURL=types.d.mts.map