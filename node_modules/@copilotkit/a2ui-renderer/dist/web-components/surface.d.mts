import { LitComponentImplementation, LitRenderable } from "./types.mjs";
import { LitElement } from "lit";
import { Catalog } from "@a2ui/web_core/v0_9";

//#region src/web-components/surface.d.ts
declare class CpkA2uiSurface extends LitElement {
  static properties: {
    operations: {
      attribute: boolean;
    };
    catalog: {
      attribute: boolean;
    };
    theme: {
      attribute: boolean;
    };
    surfaceId: {
      attribute: boolean;
    };
    loadingComponent: {
      attribute: boolean;
    };
  };
  operations: unknown[];
  catalog?: Catalog<LitComponentImplementation>;
  theme?: Record<string, unknown>;
  surfaceId?: string;
  loadingComponent?: () => LitRenderable;
  private processor;
  private processorCatalog?;
  private lastOpsHash;
  private renderedSurfaceIds;
  private error;
  protected createRenderRoot(): this;
  protected willUpdate(changed: Map<string, unknown>): void;
  private getCatalog;
  private getProcessor;
  private processOperations;
  render(): LitRenderable;
}
//#endregion
export { CpkA2uiSurface };
//# sourceMappingURL=surface.d.mts.map