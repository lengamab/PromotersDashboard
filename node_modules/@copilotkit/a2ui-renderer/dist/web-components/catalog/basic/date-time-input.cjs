const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
const require_ids = require('./ids.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/date-time-input.ts
const DateTimeInput = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.DateTimeInputApi, ({ props }) => {
	const inputId = require_ids.uniqueId("datetime");
	let type = "datetime-local";
	if (props.enableDate && !props.enableTime) type = "date";
	if (!props.enableDate && props.enableTime) type = "time";
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
      <input
        id=${inputId}
        type=${type}
        style=${(0, lit_directives_style_map_js.styleMap)({
		padding: "8px",
		width: "100%",
		border: require_utils.STANDARD_BORDER,
		borderRadius: require_utils.STANDARD_RADIUS,
		boxSizing: "border-box"
	})}
        .value=${props.value || ""}
        min=${typeof props.min === "string" ? props.min : ""}
        max=${typeof props.max === "string" ? props.max : ""}
        @input=${(e) => props.setValue(e.target.value)}
      />
    </div>
  `;
});

//#endregion
exports.DateTimeInput = DateTimeInput;
//# sourceMappingURL=date-time-input.cjs.map