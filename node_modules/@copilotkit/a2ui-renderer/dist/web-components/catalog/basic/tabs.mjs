import { createLitComponent } from "../../adapter.mjs";
import { LEAF_MARGIN } from "./utils.mjs";
import { html, nothing } from "lit";
import { TabsApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/tabs.ts
const Tabs = createLitComponent(TabsApi, ({ props, buildChild, state, requestUpdate }) => {
	const local = state;
	const tabs = props.tabs || [];
	const activeTab = tabs[local.selectedIndex] ?? tabs[0];
	return html`
      <div
        style=${styleMap({
		display: "flex",
		flexDirection: "column",
		width: "100%",
		margin: LEAF_MARGIN
	})}
      >
        <div
          style=${styleMap({
		display: "flex",
		borderBottom: "1px solid #ccc",
		marginBottom: "8px"
	})}
        >
          ${tabs.map((tab, i) => html`
              <button
                type="button"
                @click=${() => {
		local.selectedIndex = i;
		requestUpdate();
	}}
                style=${styleMap({
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
          ${activeTab ? buildChild(activeTab.child) : nothing}
        </div>
      </div>
    `;
}, () => ({ selectedIndex: 0 }));

//#endregion
export { Tabs };
//# sourceMappingURL=tabs.mjs.map