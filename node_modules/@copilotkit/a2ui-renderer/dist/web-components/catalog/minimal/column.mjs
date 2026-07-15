import { createLitComponent } from "../../adapter.mjs";
import { renderChildList } from "../children.mjs";
import { mapAlign, mapJustify } from "./utils.mjs";
import { html } from "lit";
import { CommonSchemas } from "@a2ui/web_core/v0_9";
import { styleMap } from "lit/directives/style-map.js";
import { z } from "zod";

//#region src/web-components/catalog/minimal/column.ts
const ColumnSchema = z.object({
	children: CommonSchemas.ChildList,
	justify: z.enum([
		"start",
		"center",
		"end",
		"spaceBetween",
		"spaceAround",
		"spaceEvenly",
		"stretch"
	]).optional(),
	align: z.enum([
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
const Column = createLitComponent(ColumnApiDef, ({ props, buildChild }) => html`
    <div
      style=${styleMap({
	display: "flex",
	flexDirection: "column",
	justifyContent: mapJustify(props.justify),
	alignItems: mapAlign(props.align),
	gap: "8px"
})}
    >
      ${renderChildList(props.children, buildChild)}
    </div>
  `);

//#endregion
export { Column, ColumnApiDef, ColumnSchema };
//# sourceMappingURL=column.mjs.map