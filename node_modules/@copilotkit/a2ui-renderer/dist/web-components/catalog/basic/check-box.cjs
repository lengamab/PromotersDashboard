const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
const require_ids = require('./ids.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/check-box.ts
const CheckBox = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.CheckBoxApi, ({ props }) => {
	const inputId = require_ids.uniqueId("checkbox");
	const hasError = props.validationErrors && props.validationErrors.length > 0;
	return lit.html`
    <div
      style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		margin: require_utils.LEAF_MARGIN
	})}
    >
      <div style="display: flex; align-items: center; gap: 8px;">
        <input
          id=${inputId}
          type="checkbox"
          .checked=${!!props.value}
          @change=${(e) => props.setValue(e.target.checked)}
          style=${(0, lit_directives_style_map_js.styleMap)({
		cursor: "pointer",
		outline: hasError ? "1px solid red" : "none"
	})}
        />
        ${props.label ? lit.html`<label
              for=${inputId}
              style=${(0, lit_directives_style_map_js.styleMap)({
		cursor: "pointer",
		color: hasError ? "red" : "inherit"
	})}
              >${props.label}</label
            >` : lit.nothing}
      </div>
      ${hasError ? lit.html`<span
            style="font-size: 12px; color: red; margin-top: 4px;"
            >${props.validationErrors?.[0]}</span
          >` : lit.nothing}
    </div>
  `;
});

//#endregion
exports.CheckBox = CheckBox;
//# sourceMappingURL=check-box.cjs.map