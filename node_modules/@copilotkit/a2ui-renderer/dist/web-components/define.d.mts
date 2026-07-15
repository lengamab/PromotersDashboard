import { CpkA2uiBoundComponent } from "./bound-component.mjs";
import { CpkA2uiNode } from "./node.mjs";
import { CpkA2uiSurface } from "./surface.mjs";

//#region src/web-components/define.d.ts
declare const CPK_A2UI_SURFACE_TAG = "cpk-a2ui-surface";
declare const CPK_A2UI_NODE_TAG = "cpk-a2ui-node";
declare const CPK_A2UI_BOUND_COMPONENT_TAG = "cpk-a2ui-bound-component";
declare function defineA2UIWebComponents(): void;
declare global {
  interface HTMLElementTagNameMap {
    "cpk-a2ui-surface": CpkA2uiSurface;
    "cpk-a2ui-node": CpkA2uiNode;
    "cpk-a2ui-bound-component": CpkA2uiBoundComponent;
  }
} //# sourceMappingURL=define.d.ts.map
//#endregion
export { CPK_A2UI_BOUND_COMPONENT_TAG, CPK_A2UI_NODE_TAG, CPK_A2UI_SURFACE_TAG, CpkA2uiBoundComponent, CpkA2uiNode, CpkA2uiSurface, defineA2UIWebComponents };
//# sourceMappingURL=define.d.mts.map