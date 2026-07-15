const require_adapter = require('../../adapter.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let zod = require("zod");

//#region src/web-components/catalog/minimal/text.ts
const TextSchema = zod.z.object({
	text: _a2ui_web_core_v0_9.CommonSchemas.DynamicString,
	variant: zod.z.enum([
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"caption",
		"body"
	]).optional()
});
const TextApiDef = {
	name: "Text",
	schema: TextSchema
};
const Text = require_adapter.createLitComponent(TextApiDef, ({ props }) => {
	const text = props.text ?? "";
	switch (props.variant) {
		case "h1": return lit.html`<h1>${text}</h1>`;
		case "h2": return lit.html`<h2>${text}</h2>`;
		case "h3": return lit.html`<h3>${text}</h3>`;
		case "h4": return lit.html`<h4>${text}</h4>`;
		case "h5": return lit.html`<h5>${text}</h5>`;
		case "caption": return lit.html`<small>${text}</small>`;
		default: return lit.html`<span>${text}</span>`;
	}
});

//#endregion
exports.Text = Text;
exports.TextApiDef = TextApiDef;
exports.TextSchema = TextSchema;
//# sourceMappingURL=text.cjs.map