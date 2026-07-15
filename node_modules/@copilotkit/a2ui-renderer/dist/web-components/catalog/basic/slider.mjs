import { createLitComponent } from "../../adapter.mjs";
import { LEAF_MARGIN } from "./utils.mjs";
import { uniqueId } from "./ids.mjs";
import { html, nothing } from "lit";
import { SliderApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/slider.ts
const Slider = createLitComponent(SliderApi, ({ props }) => {
	const inputId = uniqueId("slider");
	return html`
    <div
      style=${styleMap({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		margin: LEAF_MARGIN,
		width: "100%"
	})}
    >
      <div style="display: flex; justify-content: space-between;">
        ${props.label ? html`<label
              for=${inputId}
              style="font-size: 14px; font-weight: bold;"
              >${props.label}</label
            >` : nothing}
        <span style="font-size: 12px; color: #666;">${props.value}</span>
      </div>
      <input
        id=${inputId}
        type="range"
        min=${props.min ?? 0}
        max=${props.max}
        .value=${String(props.value ?? 0)}
        @input=${(e) => props.setValue(Number(e.target.value))}
        style="width: 100%; cursor: pointer;"
      />
    </div>
  `;
});

//#endregion
export { Slider };
//# sourceMappingURL=slider.mjs.map