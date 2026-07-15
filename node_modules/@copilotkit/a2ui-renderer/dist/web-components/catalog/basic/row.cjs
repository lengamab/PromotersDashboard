const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
const require_children = require('../children.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/row.ts
const Row = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.RowApi, ({ props, buildChild }) => lit.html`
  <div
    style=${(0, lit_directives_style_map_js.styleMap)({
	display: "flex",
	flexDirection: "row",
	justifyContent: require_utils.mapJustify(props.justify),
	alignItems: require_utils.mapAlign(props.align),
	width: "100%",
	margin: "0",
	padding: "0"
})}
  >
    ${require_children.renderChildList(props.children, buildChild)}
  </div>
`);

//#endregion
exports.Row = Row;
//# sourceMappingURL=row.cjs.map