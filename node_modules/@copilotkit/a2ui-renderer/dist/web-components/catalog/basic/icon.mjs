import { createLitComponent } from "../../adapter.mjs";
import { getBaseLeafStyle } from "./utils.mjs";
import { html } from "lit";
import { IconApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/icon.ts
const Icon = createLitComponent(IconApi, ({ props }) => {
	const iconName = typeof props.name === "string" ? props.name : props.name?.path;
	return html`
    <span
      class="material-symbols-outlined"
      style=${styleMap({
		...getBaseLeafStyle(),
		fontSize: "24px",
		width: "24px",
		height: "24px",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center"
	})}
      >${iconName}</span
    >
  `;
});

//#endregion
export { Icon };
//# sourceMappingURL=icon.mjs.map