import { CpkA2uiBoundComponent } from "./bound-component.mjs";
import { CpkA2uiNode } from "./node.mjs";
import { CpkA2uiSurface } from "./surface.mjs";

//#region src/web-components/define.ts
const CPK_A2UI_SURFACE_TAG = "cpk-a2ui-surface";
const CPK_A2UI_NODE_TAG = "cpk-a2ui-node";
const CPK_A2UI_BOUND_COMPONENT_TAG = "cpk-a2ui-bound-component";
function defineA2UIWebComponents() {
	if (!customElements.get(CPK_A2UI_BOUND_COMPONENT_TAG)) customElements.define(CPK_A2UI_BOUND_COMPONENT_TAG, CpkA2uiBoundComponent);
	if (!customElements.get(CPK_A2UI_NODE_TAG)) customElements.define(CPK_A2UI_NODE_TAG, CpkA2uiNode);
	if (!customElements.get(CPK_A2UI_SURFACE_TAG)) customElements.define(CPK_A2UI_SURFACE_TAG, CpkA2uiSurface);
}

//#endregion
export { CPK_A2UI_BOUND_COMPONENT_TAG, CPK_A2UI_NODE_TAG, CPK_A2UI_SURFACE_TAG, CpkA2uiBoundComponent, CpkA2uiNode, CpkA2uiSurface, defineA2UIWebComponents };
//# sourceMappingURL=define.mjs.map