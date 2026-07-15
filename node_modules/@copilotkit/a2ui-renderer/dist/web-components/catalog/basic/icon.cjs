const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/icon.ts
const Icon = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.IconApi, ({ props }) => {
	const iconName = typeof props.name === "string" ? props.name : props.name?.path;
	return lit.html`
    <span
      class="material-symbols-outlined"
      style=${(0, lit_directives_style_map_js.styleMap)({
		...require_utils.getBaseLeafStyle(),
		fontSize: "24px",
		width: "24px",
		height: "24px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center"
	})}
      >${iconName}</span
    >
  `;
});

//#endregion
exports.Icon = Icon;
//# sourceMappingURL=icon.cjs.map