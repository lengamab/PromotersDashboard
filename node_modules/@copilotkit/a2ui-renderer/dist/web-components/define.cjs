Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_bound_component = require('./bound-component.cjs');
const require_node = require('./node.cjs');
const require_surface = require('./surface.cjs');

//#region src/web-components/define.ts
const CPK_A2UI_SURFACE_TAG = "cpk-a2ui-surface";
const CPK_A2UI_NODE_TAG = "cpk-a2ui-node";
const CPK_A2UI_BOUND_COMPONENT_TAG = "cpk-a2ui-bound-component";
function defineA2UIWebComponents() {
	if (!customElements.get(CPK_A2UI_BOUND_COMPONENT_TAG)) customElements.define(CPK_A2UI_BOUND_COMPONENT_TAG, require_bound_component.CpkA2uiBoundComponent);
	if (!customElements.get(CPK_A2UI_NODE_TAG)) customElements.define(CPK_A2UI_NODE_TAG, require_node.CpkA2uiNode);
	if (!customElements.get(CPK_A2UI_SURFACE_TAG)) customElements.define(CPK_A2UI_SURFACE_TAG, require_surface.CpkA2uiSurface);
}

//#endregion
exports.CPK_A2UI_BOUND_COMPONENT_TAG = CPK_A2UI_BOUND_COMPONENT_TAG;
exports.CPK_A2UI_NODE_TAG = CPK_A2UI_NODE_TAG;
exports.CPK_A2UI_SURFACE_TAG = CPK_A2UI_SURFACE_TAG;
exports.CpkA2uiBoundComponent = require_bound_component.CpkA2uiBoundComponent;
exports.CpkA2uiNode = require_node.CpkA2uiNode;
exports.CpkA2uiSurface = require_surface.CpkA2uiSurface;
exports.defineA2UIWebComponents = defineA2UIWebComponents;
//# sourceMappingURL=define.cjs.map