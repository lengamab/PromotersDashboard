import { __exportAll } from "../../_virtual/_rolldown/runtime.mjs";
import { Button, ButtonApiDef, ButtonSchema } from "./button.mjs";
import { Column, ColumnApiDef, ColumnSchema } from "./column.mjs";
import { Row, RowApiDef, RowSchema } from "./row.mjs";
import { Text, TextApiDef, TextSchema } from "./text.mjs";
import { TextField, TextFieldApiDef, TextFieldSchema } from "./text-field.mjs";
import { minimalComponents } from "./components.mjs";
import { Catalog, createFunctionImplementation } from "@a2ui/web_core/v0_9";
import { z } from "zod";

//#region src/web-components/catalog/minimal/index.ts
var minimal_exports = /* @__PURE__ */ __exportAll({
	Button: () => Button,
	ButtonApiDef: () => ButtonApiDef,
	ButtonSchema: () => ButtonSchema,
	Column: () => Column,
	ColumnApiDef: () => ColumnApiDef,
	ColumnSchema: () => ColumnSchema,
	Row: () => Row,
	RowApiDef: () => RowApiDef,
	RowSchema: () => RowSchema,
	Text: () => Text,
	TextApiDef: () => TextApiDef,
	TextField: () => TextField,
	TextFieldApiDef: () => TextFieldApiDef,
	TextFieldSchema: () => TextFieldSchema,
	TextSchema: () => TextSchema,
	minimalCatalog: () => minimalCatalog,
	minimalComponents: () => minimalComponents
});
const minimalCatalog = new Catalog("https://a2ui.org/specification/v0_9/catalogs/minimal/minimal_catalog.json", minimalComponents, [createFunctionImplementation({
	name: "capitalize",
	returnType: "string",
	schema: z.object({ value: z.unknown() })
}, (args) => {
	const val = args.value;
	if (typeof val === "string") return val.toUpperCase();
	return val;
})]);

//#endregion
export { minimalCatalog, minimal_exports };
//# sourceMappingURL=index.mjs.map