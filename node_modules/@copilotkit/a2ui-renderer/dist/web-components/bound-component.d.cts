import { LitRenderable, LitRendererFn } from "./types.cjs";
import { LitElement, nothing } from "lit";
import { ComponentApi, ComponentContext } from "@a2ui/web_core/v0_9";

//#region src/web-components/bound-component.d.ts
declare class CpkA2uiBoundComponent extends LitElement {
  static properties: {
    api: {
      attribute: boolean;
    };
    context: {
      attribute: boolean;
    };
    buildChild: {
      attribute: boolean;
    };
    renderFn: {
      attribute: boolean;
    };
    setupState: {
      attribute: boolean;
    };
  };
  api?: ComponentApi;
  context?: ComponentContext;
  buildChild?: (id: string, basePath?: string) => LitRenderable;
  renderFn?: LitRendererFn<any, any>;
  setupState?: () => unknown;
  private binder;
  private binderContext;
  private propsSnapshot;
  private stateInitialized;
  private state;
  protected createRenderRoot(): this;
  connectedCallback(): void;
  disconnectedCallback(): void;
  private disposeBinder;
  private ensureBinder;
  private ensureState;
  render(): LitRenderable | typeof nothing;
}
//#endregion
export { CpkA2uiBoundComponent };
//# sourceMappingURL=bound-component.d.cts.map