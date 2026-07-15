const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_button = require('./button.cjs');
const require_column = require('./column.cjs');
const require_row = require('./row.cjs');
const require_text = require('./text.cjs');
const require_text_field = require('./text-field.cjs');
const require_components = require('./components.cjs');
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let zod = require("zod");

//#region src/web-components/catalog/minimal/index.ts
var minimal_exports = /* @__PURE__ */ require_runtime.__exportAll({
	Button: () => require_button.Button,
	ButtonApiDef: () => require_button.ButtonApiDef,
	ButtonSchema: () => require_button.ButtonSchema,
	Column: () => require_column.Column,
	ColumnApiDef: () => require_column.ColumnApiDef,
	ColumnSchema: () => require_column.ColumnSchema,
	Row: () => require_row.Row,
	RowApiDef: () => require_row.RowApiDef,
	RowSchema: () => require_row.RowSchema,
	Text: () => require_text.Text,
	TextApiDef: () => require_text.TextApiDef,
	TextField: () => require_text_field.TextField,
	TextFieldApiDef: () => require_text_field.TextFieldApiDef,
	TextFieldSchema: () => require_text_field.TextFieldSchema,
	TextSchema: () => require_text.TextSchema,
	minimalCatalog: () => minimalCatalog,
	minimalComponents: () => require_components.minimalComponents
});
const minimalCatalog = new _a2ui_web_core_v0_9.Catalog("https://a2ui.org/specification/v0_9/catalogs/minimal/minimal_catalog.json", require_components.minimalComponents, [(0, _a2ui_web_core_v0_9.createFunctionImplementation)({
	name: "capitalize",
	returnType: "string",
	schema: zod.z.object({ value: zod.z.unknown() })
}, (args) => {
	const val = args.value;
	if (typeof val === "string") return val.toUpperCase();
	return val;
})]);

//#endregion
exports.minimalCatalog = minimalCatalog;
Object.defineProperty(exports, 'minimal_exports', {
  enumerable: true,
  get: function () {
    return minimal_exports;
  }
});
//# sourceMappingURL=index.cjs.map