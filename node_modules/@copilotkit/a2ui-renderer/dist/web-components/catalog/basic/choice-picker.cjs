const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/choice-picker.ts
const ChoicePicker = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.ChoicePickerApi, ({ props, context, state, requestUpdate }) => {
	const local = state;
	const values = Array.isArray(props.value) ? props.value : [];
	const isMutuallyExclusive = props.variant === "mutuallyExclusive";
	const onToggle = (val) => {
		if (isMutuallyExclusive) props.setValue([val]);
		else props.setValue(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
	};
	const options = (props.options || []).filter((opt) => !props.filterable || local.filter === "" || String(opt.label).toLowerCase().includes(local.filter.toLowerCase()));
	return lit.html`
      <div
        style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		margin: require_utils.LEAF_MARGIN,
		width: "100%"
	})}
      >
        ${props.label ? lit.html`<strong style="font-size: 14px;">${props.label}</strong>` : lit.nothing}
        ${props.filterable ? lit.html`<input
              type="text"
              placeholder="Filter options..."
              .value=${local.filter}
              @input=${(e) => {
		local.filter = e.target.value;
		requestUpdate();
	}}
              style=${(0, lit_directives_style_map_js.styleMap)({
		padding: "4px 8px",
		border: require_utils.STANDARD_BORDER,
		borderRadius: require_utils.STANDARD_RADIUS
	})}
            />` : lit.nothing}
        <div
          style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: props.displayStyle === "chips" ? "row" : "column",
		flexWrap: props.displayStyle === "chips" ? "wrap" : "nowrap",
		gap: "8px"
	})}
        >
          ${options.map((opt) => {
		const isSelected = values.includes(opt.value);
		if (props.displayStyle === "chips") return lit.html`
                <button
                  type="button"
                  @click=${() => onToggle(opt.value)}
                  style=${(0, lit_directives_style_map_js.styleMap)({
			padding: "4px 12px",
			borderRadius: "16px",
			border: isSelected ? "1px solid var(--a2ui-primary-color, #007bff)" : require_utils.STANDARD_BORDER,
			backgroundColor: isSelected ? "var(--a2ui-primary-color, #007bff)" : "#fff",
			color: isSelected ? "#fff" : "inherit",
			cursor: "pointer",
			fontSize: "12px"
		})}
                >
                  ${opt.label}
                </button>
              `;
		return lit.html`
              <label
                style="display: flex; align-items: center; gap: 8px; cursor: pointer;"
              >
                <input
                  type=${isMutuallyExclusive ? "radio" : "checkbox"}
                  .checked=${isSelected}
                  name=${isMutuallyExclusive ? `choice-${context.componentModel.id}` : ""}
                  @change=${() => onToggle(opt.value)}
                />
                <span style="font-size: 14px;">${opt.label}</span>
              </label>
            `;
	})}
        </div>
      </div>
    `;
}, () => ({ filter: "" }));

//#endregion
exports.ChoicePicker = ChoicePicker;
//# sourceMappingURL=choice-picker.cjs.map