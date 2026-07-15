import { createLitComponent } from "../../adapter.mjs";
import { LEAF_MARGIN, STANDARD_BORDER, STANDARD_RADIUS } from "./utils.mjs";
import { uniqueId } from "./ids.mjs";
import { html, nothing } from "lit";
import { TextFieldApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/text-field.ts
const TextField = createLitComponent(TextFieldApi, ({ props }) => {
	const inputId = uniqueId("textfield");
	const isLong = props.variant === "longText";
	const type = props.variant === "number" ? "number" : props.variant === "obscured" ? "password" : "text";
	const hasError = props.validationErrors && props.validationErrors.length > 0;
	const style = {
		padding: "8px",
		width: "100%",
		border: hasError ? "1px solid red" : STANDARD_BORDER,
		borderRadius: STANDARD_RADIUS,
		boxSizing: "border-box"
	};
	const onChange = (e) => {
		props.setValue(e.target.value);
	};
	return html`
    <div
      style=${styleMap({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		width: "100%",
		margin: LEAF_MARGIN
	})}
    >
      ${props.label ? html`<label
            for=${inputId}
            style="font-size: 14px; font-weight: bold;"
            >${props.label}</label
          >` : nothing}
      ${isLong ? html`<textarea
            id=${inputId}
            style=${styleMap(style)}
            .value=${props.value || ""}
            @input=${onChange}
          ></textarea>` : html`<input
            id=${inputId}
            type=${type}
            style=${styleMap(style)}
            .value=${props.value || ""}
            @input=${onChange}
          />`}
      ${hasError ? html`<span style="font-size: 12px; color: red;"
            >${props.validationErrors[0]}</span
          >` : nothing}
    </div>
  `;
});

//#endregion
export { TextField };
//# sourceMappingURL=text-field.mjs.map