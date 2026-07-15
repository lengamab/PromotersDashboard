import { LitComponentImplementation, LitRenderable, LitRendererFn } from "./types.mjs";
import { ComponentApi } from "@a2ui/web_core/v0_9";

//#region src/web-components/adapter.d.ts
declare function createLitComponent<Api extends ComponentApi, S = void>(api: Api, renderFn: LitRendererFn<Api, S>, setupState?: () => S): LitComponentImplementation;
declare function createBinderlessLitComponent(api: ComponentApi, renderFn: (componentProps: {
  context: Parameters<LitComponentImplementation["render"]>[0];
  buildChild: (id: string, basePath?: string) => LitRenderable;
}) => LitRenderable): LitComponentImplementation;
//#endregion
export { createBinderlessLitComponent, createLitComponent };
//# sourceMappingURL=adapter.d.mts.map