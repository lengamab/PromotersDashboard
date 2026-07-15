const require_adapter = require('../../adapter.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/modal.ts
const Modal = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.ModalApi, ({ props, buildChild, state, requestUpdate }) => {
	const local = state;
	return lit.html`
      <div
        @click=${() => {
		local.isOpen = true;
		requestUpdate();
	}}
        style="display: inline-block;"
      >
        ${props.trigger ? buildChild(props.trigger) : lit.nothing}
      </div>
      ${local.isOpen ? lit.html`
            <div
              style=${(0, lit_directives_style_map_js.styleMap)({
		position: "fixed",
		top: "0",
		left: "0",
		right: "0",
		bottom: "0",
		backgroundColor: "rgba(0,0,0,0.5)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: "1000"
	})}
              @click=${() => {
		local.isOpen = false;
		requestUpdate();
	}}
            >
              <div
                style=${(0, lit_directives_style_map_js.styleMap)({
		backgroundColor: "#fff",
		padding: "24px",
		borderRadius: "8px",
		maxWidth: "90%",
		maxHeight: "90%",
		overflow: "auto",
		display: "flex",
		flexDirection: "column"
	})}
                @click=${(e) => e.stopPropagation()}
              >
                <div style="display: flex; justify-content: flex-end;">
                  <button
                    type="button"
                    @click=${() => {
		local.isOpen = false;
		requestUpdate();
	}}
                    style=${(0, lit_directives_style_map_js.styleMap)({
		border: "none",
		background: "none",
		fontSize: "20px",
		cursor: "pointer",
		padding: "4px"
	})}
                  >
                    &times;
                  </button>
                </div>
                <div style="flex: 1;">
                  ${props.content ? buildChild(props.content) : lit.nothing}
                </div>
              </div>
            </div>
          ` : lit.nothing}
    `;
}, () => ({ isOpen: false }));

//#endregion
exports.Modal = Modal;
//# sourceMappingURL=modal.cjs.map