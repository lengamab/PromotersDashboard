import { createLitComponent } from "../../adapter.mjs";
import { getBaseContainerStyle } from "./utils.mjs";
import { html, nothing } from "lit";
import { CardApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/card.ts
const Card = createLitComponent(CardApi, ({ props, buildChild }) => html`
  <div
    style=${styleMap({
	...getBaseContainerStyle(),
	backgroundColor: "#fff",
	boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
	width: "100%"
})}
  >
    ${props.child ? buildChild(props.child) : nothing}
  </div>
`);

//#endregion
export { Card };
//# sourceMappingURL=card.mjs.map