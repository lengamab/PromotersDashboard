import { LitComponentImplementation, LitRenderable } from "./types.cjs";
import { LitElement, nothing } from "lit";
import { SurfaceModel } from "@a2ui/web_core/v0_9";

//#region src/web-components/node.d.ts
declare class CpkA2uiNode extends LitElement {
  static properties: {
    surface: {
      attribute: boolean;
    };
    componentId: {
      attribute: boolean;
    };
    basePath: {
      attribute: boolean;
    };
  };
  surface?: SurfaceModel<LitComponentImplementation>;
  componentId: string;
  basePath: string;
  private subscriptions;
  private subscribedSurface?;
  private subscribedComponentId?;
  protected createRenderRoot(): this;
  connectedCallback(): void;
  disconnectedCallback(): void;
  private unsubscribe;
  private ensureSubscriptions;
  render(): LitRenderable | typeof nothing;
}
//#endregion
export { CpkA2uiNode };
//# sourceMappingURL=node.d.cts.map