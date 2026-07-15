import { createLitComponent } from "../../adapter.mjs";
import { LEAF_MARGIN } from "./utils.mjs";
import { html } from "lit";
import { DividerApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/divider.ts
const Divider = createLitComponent(DividerApi, ({ props }) => {
	const isVertical = props.axis === "vertical";
	return html`<div style=${styleMap({
		margin: LEAF_MARGIN,
		border: "none",
		backgroundColor: "#ccc",
		width: isVertical ? "1px" : "100%",
		height: isVertical ? "100%" : "1px"
	})}></div>`;
});

//#endregion
export { Divider };
//# sourceMappingURL=divider.mjs.map