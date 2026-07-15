const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/card.ts
const Card = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.CardApi, ({ props, buildChild }) => lit.html`
  <div
    style=${(0, lit_directives_style_map_js.styleMap)({
	...require_utils.getBaseContainerStyle(),
	backgroundColor: "#fff",
	boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
	width: "100%"
})}
  >
    ${props.child ? buildChild(props.child) : lit.nothing}
  </div>
`);

//#endregion
exports.Card = Card;
//# sourceMappingURL=card.cjs.map