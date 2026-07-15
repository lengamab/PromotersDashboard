const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
const require_ids = require('./ids.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/slider.ts
const Slider = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.SliderApi, ({ props }) => {
	const inputId = require_ids.uniqueId("slider");
	return lit.html`
    <div
      style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		margin: require_utils.LEAF_MARGIN,
		width: "100%"
	})}
    >
      <div style="display: flex; justify-content: space-between;">
        ${props.label ? lit.html`<label
              for=${inputId}
              style="font-size: 14px; font-weight: bold;"
              >${props.label}</label
            >` : lit.nothing}
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
exports.Slider = Slider;
//# sourceMappingURL=slider.cjs.map