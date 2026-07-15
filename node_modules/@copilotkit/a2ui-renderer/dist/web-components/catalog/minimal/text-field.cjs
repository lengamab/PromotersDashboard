const require_adapter = require('../../adapter.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let lit_directives_style_map_js = require("lit/directives/style-map.js");
let zod = require("zod");

//#region src/web-components/catalog/minimal/text-field.ts
const TextFieldSchema = zod.z.object({
	label: _a2ui_web_core_v0_9.CommonSchemas.DynamicString,
	value: _a2ui_web_core_v0_9.CommonSchemas.DynamicString,
	variant: zod.z.enum([
		"longText",
		"number",
		"shortText",
		"obscured"
	]).optional(),
	validationRegexp: zod.z.string().optional()
});
const TextFieldApiDef = {
	name: "TextField",
	schema: TextFieldSchema
};
const TextField = require_adapter.createLitComponent(TextFieldApiDef, ({ props, context }) => {
	const isLong = props.variant === "longText";
	const type = props.variant === "number" ? "number" : props.variant === "obscured" ? "password" : "text";
	const id = `textfield-${context.componentModel.id}`;
	const style = {
		padding: "8px",
		width: "100%",
		border: "1px solid #ccc",
		borderRadius: "4px",
		boxSizing: "border-box"
	};
	const onChange = (event) => {
		props.setValue?.(event.target.value);
	};
	return lit.html`
      <div
        style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		width: "100%"
	})}
      >
        ${props.label ? lit.html`<label
              for=${id}
              style=${(0, lit_directives_style_map_js.styleMap)({
		fontSize: "14px",
		fontWeight: "bold"
	})}
              >${props.label}</label
            >` : null}
        ${isLong ? lit.html`<textarea
              id=${id}
              style=${(0, lit_directives_style_map_js.styleMap)(style)}
              .value=${props.value || ""}
              @input=${onChange}
            ></textarea>` : lit.html`<input
              id=${id}
              type=${type}
              style=${(0, lit_directives_style_map_js.styleMap)(style)}
              .value=${props.value || ""}
              @input=${onChange}
            />`}
      </div>
    `;
});

//#endregion
exports.TextField = TextField;
exports.TextFieldApiDef = TextFieldApiDef;
exports.TextFieldSchema = TextFieldSchema;
//# sourceMappingURL=text-field.cjs.map