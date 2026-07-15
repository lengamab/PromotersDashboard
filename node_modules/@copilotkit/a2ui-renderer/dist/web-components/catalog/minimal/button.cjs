const require_adapter = require('../../adapter.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let lit_directives_style_map_js = require("lit/directives/style-map.js");
let zod = require("zod");

//#region src/web-components/catalog/minimal/button.ts
const ButtonSchema = zod.z.object({
	child: _a2ui_web_core_v0_9.CommonSchemas.ComponentId,
	action: _a2ui_web_core_v0_9.CommonSchemas.Action,
	variant: zod.z.enum(["primary", "borderless"]).optional()
});
const ButtonApiDef = {
	name: "Button",
	schema: ButtonSchema
};
const Button = require_adapter.createLitComponent(ButtonApiDef, ({ props, buildChild }) => lit.html`
    <button
      type="button"
      style=${(0, lit_directives_style_map_js.styleMap)({
	padding: "8px 16px",
	cursor: "pointer",
	border: props.variant === "borderless" ? "none" : "1px solid #ccc",
	backgroundColor: props.variant === "primary" ? "#007bff" : "transparent",
	color: props.variant === "primary" ? "#fff" : "inherit",
	borderRadius: "4px"
})}
      @click=${() => props.action?.()}
    >
      ${props.child ? buildChild(props.child) : null}
    </button>
  `);

//#endregion
exports.Button = Button;
exports.ButtonApiDef = ButtonApiDef;
exports.ButtonSchema = ButtonSchema;
//# sourceMappingURL=button.cjs.map