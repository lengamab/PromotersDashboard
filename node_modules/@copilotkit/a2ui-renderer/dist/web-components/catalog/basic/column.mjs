import { createLitComponent } from "../../adapter.mjs";
import { mapAlign, mapJustify } from "./utils.mjs";
import { renderChildList } from "../children.mjs";
import { html } from "lit";
import { ColumnApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/column.ts
const Column = createLitComponent(ColumnApi, ({ props, buildChild }) => html`
    <div
      style=${styleMap({
	display: "flex",
	flexDirection: "column",
	justifyContent: mapJustify(props.justify),
	alignItems: mapAlign(props.align),
	width: "100%",
	margin: "0",
	padding: "0"
})}
    >
      ${renderChildList(props.children, buildChild)}
    </div>
  `);

//#endregion
export { Column };
//# sourceMappingURL=column.mjs.map