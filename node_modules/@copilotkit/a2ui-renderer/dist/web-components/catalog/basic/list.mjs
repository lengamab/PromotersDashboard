import { createLitComponent } from "../../adapter.mjs";
import { mapAlign } from "./utils.mjs";
import { renderChildList } from "../children.mjs";
import { html } from "lit";
import { ListApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/list.ts
const List = createLitComponent(ListApi, ({ props, buildChild }) => {
	const isHorizontal = props.direction === "horizontal";
	return html`
    <div
      style=${styleMap({
		display: "flex",
		flexDirection: isHorizontal ? "row" : "column",
		alignItems: mapAlign(props.align),
		overflowX: isHorizontal ? "auto" : "hidden",
		overflowY: isHorizontal ? "hidden" : "auto",
		width: "100%",
		margin: "0",
		padding: "0"
	})}
    >
      ${renderChildList(props.children, buildChild)}
    </div>
  `;
});

//#endregion
export { List };
//# sourceMappingURL=list.mjs.map