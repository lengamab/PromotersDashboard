const require_adapter = require('../../adapter.cjs');
const require_children = require('../children.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let lit_directives_style_map_js = require("lit/directives/style-map.js");
let zod = require("zod");

//#region src/web-components/catalog/minimal/row.ts
const RowSchema = zod.z.object({
	children: _a2ui_web_core_v0_9.CommonSchemas.ChildList,
	justify: zod.z.enum([
		"center",
		"end",
		"spaceAround",
		"spaceBetween",
		"spaceEvenly",
		"start",
		"stretch"
	]).optional(),
	align: zod.z.enum([
		"start",
		"center",
		"end",
		"stretch"
	]).optional()
});
const RowApiDef = {
	name: "Row",
	schema: RowSchema
};
const Row = require_adapter.createLitComponent(RowApiDef, ({ props, buildChild }) => lit.html`
  <div
    style=${(0, lit_directives_style_map_js.styleMap)({
	display: "flex",
	flexDirection: "row",
	justifyContent: require_utils.mapJustify(props.justify),
	alignItems: require_utils.mapAlign(props.align)
})}
  >
    ${require_children.renderChildList(props.children, buildChild)}
  </div>
`);

//#endregion
exports.Row = Row;
exports.RowApiDef = RowApiDef;
exports.RowSchema = RowSchema;
//# sourceMappingURL=row.cjs.map