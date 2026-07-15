const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/button.ts
const Button = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.ButtonApi, ({ props, buildChild }) => lit.html`
    <button
      type="button"
      style=${(0, lit_directives_style_map_js.styleMap)({
	margin: require_utils.LEAF_MARGIN,
	padding: "8px 16px",
	cursor: "pointer",
	border: props.variant === "borderless" ? "none" : "1px solid #ccc",
	backgroundColor: props.variant === "primary" ? "var(--a2ui-primary-color, #007bff)" : props.variant === "borderless" ? "transparent" : "#fff",
	color: props.variant === "primary" ? "#fff" : "inherit",
	borderRadius: "4px",
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	boxSizing: "border-box"
})}
      ?disabled=${props.isValid === false}
      @click=${() => props.action?.()}
    >
      ${props.child ? buildChild(props.child) : lit.nothing}
    </button>
  `);

//#endregion
exports.Button = Button;
//# sourceMappingURL=button.cjs.map