const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/image.ts
const Image = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.ImageApi, ({ props }) => {
	const mapFit = (fit) => {
		if (fit === "scaleDown") return "scale-down";
		return fit || "fill";
	};
	const style = {
		...require_utils.getBaseLeafStyle(),
		objectFit: mapFit(props.fit),
		width: "100%",
		height: "auto",
		display: "block"
	};
	if (props.variant === "icon") {
		style.width = "24px";
		style.height = "24px";
	} else if (props.variant === "avatar") {
		style.width = "40px";
		style.height = "40px";
		style.borderRadius = "50%";
	} else if (props.variant === "smallFeature") style.maxWidth = "100px";
	else if (props.variant === "largeFeature") style.maxHeight = "400px";
	else if (props.variant === "header") {
		style.height = "200px";
		style.objectFit = "cover";
	}
	return lit.html`<img
    src=${props.url ?? ""}
    alt=${props.description ?? ""}
    style=${(0, lit_directives_style_map_js.styleMap)(style)}
  />`;
});

//#endregion
exports.Image = Image;
//# sourceMappingURL=image.cjs.map