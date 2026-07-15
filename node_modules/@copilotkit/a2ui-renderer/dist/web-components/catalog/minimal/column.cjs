const require_adapter = require('../../adapter.cjs');
const require_children = require('../children.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let lit_directives_style_map_js = require("lit/directives/style-map.js");
let zod = require("zod");

//#region src/web-components/catalog/minimal/column.ts
const ColumnSchema = zod.z.object({
	children: _a2ui_web_core_v0_9.CommonSchemas.ChildList,
	justify: zod.z.enum([
		"start",
		"center",
		"end",
		"spaceBetween",
		"spaceAround",
		"spaceEvenly",
		"stretch"
	]).optional(),
	align: zod.z.enum([
		"center",
		"end",
		"start",
		"stretch"
	]).optional()
});
const ColumnApiDef = {
	name: "Column",
	schema: ColumnSchema
};
const Column = require_adapter.createLitComponent(ColumnApiDef, ({ props, buildChild }) => lit.html`
    <div
      style=${(0, lit_directives_style_map_js.styleMap)({
	display: "flex",
	flexDirection: "column",
	justifyContent: require_utils.mapJustify(props.justify),
	alignItems: require_utils.mapAlign(props.align),
	gap: "8px"
})}
    >
      ${require_children.renderChildList(props.children, buildChild)}
    </div>
  `);

//#endregion
exports.Column = Column;
exports.ColumnApiDef = ColumnApiDef;
exports.ColumnSchema = ColumnSchema;
//# sourceMappingURL=column.cjs.map