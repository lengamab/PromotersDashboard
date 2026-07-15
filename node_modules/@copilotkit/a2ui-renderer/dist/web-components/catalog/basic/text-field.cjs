const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
const require_ids = require('./ids.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/text-field.ts
const TextField = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.TextFieldApi, ({ props }) => {
	const inputId = require_ids.uniqueId("textfield");
	const isLong = props.variant === "longText";
	const type = props.variant === "number" ? "number" : props.variant === "obscured" ? "password" : "text";
	const hasError = props.validationErrors && props.validationErrors.length > 0;
	const style = {
		padding: "8px",
		width: "100%",
		border: hasError ? "1px solid red" : require_utils.STANDARD_BORDER,
		borderRadius: require_utils.STANDARD_RADIUS,
		boxSizing: "border-box"
	};
	const onChange = (e) => {
		props.setValue(e.target.value);
	};
	return lit.html`
    <div
      style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		width: "100%",
		margin: require_utils.LEAF_MARGIN
	})}
    >
      ${props.label ? lit.html`<label
            for=${inputId}
            style="font-size: 14px; font-weight: bold;"
            >${props.label}</label
          >` : lit.nothing}
      ${isLong ? lit.html`<textarea
            id=${inputId}
            style=${(0, lit_directives_style_map_js.styleMap)(style)}
            .value=${props.value || ""}
            @input=${onChange}
          ></textarea>` : lit.html`<input
            id=${inputId}
            type=${type}
            style=${(0, lit_directives_style_map_js.styleMap)(style)}
            .value=${props.value || ""}
            @input=${onChange}
          />`}
      ${hasError ? lit.html`<span style="font-size: 12px; color: red;"
            >${props.validationErrors[0]}</span
          >` : lit.nothing}
    </div>
  `;
});

//#endregion
exports.TextField = TextField;
//# sourceMappingURL=text-field.cjs.map