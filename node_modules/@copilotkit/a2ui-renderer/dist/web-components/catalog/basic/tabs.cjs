const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/tabs.ts
const Tabs = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.TabsApi, ({ props, buildChild, state, requestUpdate }) => {
	const local = state;
	const tabs = props.tabs || [];
	const activeTab = tabs[local.selectedIndex] ?? tabs[0];
	return lit.html`
      <div
        style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		width: "100%",
		margin: require_utils.LEAF_MARGIN
	})}
      >
        <div
          style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		borderBottom: "1px solid #ccc",
		marginBottom: "8px"
	})}
        >
          ${tabs.map((tab, i) => lit.html`
              <button
                type="button"
                @click=${() => {
		local.selectedIndex = i;
		requestUpdate();
	}}
                style=${(0, lit_directives_style_map_js.styleMap)({
		padding: "8px 16px",
		border: "none",
		background: "none",
		borderBottom: local.selectedIndex === i ? "2px solid var(--a2ui-primary-color, #007bff)" : "none",
		fontWeight: local.selectedIndex === i ? "bold" : "normal",
		cursor: "pointer",
		color: local.selectedIndex === i ? "var(--a2ui-primary-color, #007bff)" : "inherit"
	})}
              >
                ${tab.title}
              </button>
            `)}
        </div>
        <div style="flex: 1;">
          ${activeTab ? buildChild(activeTab.child) : lit.nothing}
        </div>
      </div>
    `;
}, () => ({ selectedIndex: 0 }));

//#endregion
exports.Tabs = Tabs;
//# sourceMappingURL=tabs.cjs.map