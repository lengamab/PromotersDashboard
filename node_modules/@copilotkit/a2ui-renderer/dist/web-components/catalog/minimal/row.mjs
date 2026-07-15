import { createLitComponent } from "../../adapter.mjs";
import { renderChildList } from "../children.mjs";
import { mapAlign, mapJustify } from "./utils.mjs";
import { html } from "lit";
import { CommonSchemas } from "@a2ui/web_core/v0_9";
import { styleMap } from "lit/directives/style-map.js";
import { z } from "zod";

//#region src/web-components/catalog/minimal/row.ts
const RowSchema = z.object({
	children: CommonSchemas.ChildList,
	justify: z.enum([
		"center",
		"end",
		"spaceAround",
		"spaceBetween",
		"spaceEvenly",
		"start",
		"stretch"
	]).optional(),
	align: z.enum([
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
const Row = createLitComponent(RowApiDef, ({ props, buildChild }) => html`
  <div
    style=${styleMap({
	display: "flex",
	flexDirection: "row",
	justifyContent: mapJustify(props.justify),
	alignItems: mapAlign(props.align)
})}
  >
    ${renderChildList(props.children, buildChild)}
  </div>
`);

//#endregion
export { Row, RowApiDef, RowSchema };
//# sourceMappingURL=row.mjs.map