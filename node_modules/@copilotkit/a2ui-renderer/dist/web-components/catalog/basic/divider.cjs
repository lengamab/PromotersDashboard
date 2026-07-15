const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/divider.ts
const Divider = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.DividerApi, ({ props }) => {
	const isVertical = props.axis === "vertical";
	return lit.html`<div style=${(0, lit_directives_style_map_js.styleMap)({
		margin: require_utils.LEAF_MARGIN,
		border: "none",
		backgroundColor: "#ccc",
		width: isVertical ? "1px" : "100%",
		height: isVertical ? "100%" : "1px"
	})}></div>`;
});

//#endregion
exports.Divider = Divider;
//# sourceMappingURL=divider.cjs.map