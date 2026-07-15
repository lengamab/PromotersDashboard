const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/text.ts
const Text = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.TextApi, ({ props }) => {
	const text = props.text ?? "";
	const style = {
		...require_utils.getBaseLeafStyle(),
		display: "inline-block"
	};
	switch (props.variant) {
		case "h1": return lit.html`<h1 style=${(0, lit_directives_style_map_js.styleMap)(style)}>${text}</h1>`;
		case "h2": return lit.html`<h2 style=${(0, lit_directives_style_map_js.styleMap)(style)}>${text}</h2>`;
		case "h3": return lit.html`<h3 style=${(0, lit_directives_style_map_js.styleMap)(style)}>${text}</h3>`;
		case "h4": return lit.html`<h4 style=${(0, lit_directives_style_map_js.styleMap)(style)}>${text}</h4>`;
		case "h5": return lit.html`<h5 style=${(0, lit_directives_style_map_js.styleMap)(style)}>${text}</h5>`;
		case "caption": return lit.html`
        <small
          style=${(0, lit_directives_style_map_js.styleMap)({
			...style,
			color: "#666",
			textAlign: "left"
		})}
          >${text}</small
        >
      `;
		default: return lit.html`<span style=${(0, lit_directives_style_map_js.styleMap)(style)}>${text}</span>`;
	}
});

//#endregion
exports.Text = Text;
//# sourceMappingURL=text.cjs.map