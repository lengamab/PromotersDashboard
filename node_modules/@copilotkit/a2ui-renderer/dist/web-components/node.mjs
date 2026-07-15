import { LitElement, html, nothing } from "lit";
import { ComponentContext } from "@a2ui/web_core/v0_9";

//#region src/web-components/node.ts
var CpkA2uiNode = class extends LitElement {
	constructor(..._args) {
		super(..._args);
		this.componentId = "root";
		this.basePath = "/";
		this.subscriptions = [];
	}
	static {
		this.properties = {
			surface: { attribute: false },
			componentId: { attribute: false },
			basePath: { attribute: false }
		};
	}
	createRenderRoot() {
		return this;
	}
	connectedCallback() {
		super.connectedCallback();
		this.style.display = "contents";
	}
	disconnectedCallback() {
		this.unsubscribe();
		super.disconnectedCallback();
	}
	unsubscribe() {
		this.subscriptions.forEach((sub) => sub.unsubscribe());
		this.subscriptions = [];
		this.subscribedSurface = void 0;
		this.subscribedComponentId = void 0;
	}
	ensureSubscriptions() {
		if (!this.surface) return;
		if (this.subscribedSurface === this.surface && this.subscribedComponentId === this.componentId) return;
		this.unsubscribe();
		this.subscribedSurface = this.surface;
		this.subscribedComponentId = this.componentId;
		this.subscriptions.push(this.surface.componentsModel.onCreated.subscribe((comp) => {
			if (comp.id === this.componentId) this.requestUpdate();
		}), this.surface.componentsModel.onDeleted.subscribe((id) => {
			if (id === this.componentId) this.requestUpdate();
		}));
	}
	render() {
		this.ensureSubscriptions();
		const surface = this.surface;
		if (!surface) return nothing;
		const componentModel = surface.componentsModel.get(this.componentId);
		if (!componentModel) return html`
        <div
          style="
            padding: 12px 16px;
            border-radius: 8px;
            background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
            background-size: 200% 100%;
            animation: a2ui-shimmer 1.5s ease-in-out infinite;
            min-height: 2rem;
          "
        >
          <style>
            @keyframes a2ui-shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          </style>
        </div>
      `;
		const compImpl = surface.catalog.components.get(componentModel.type);
		if (!compImpl) return html`
        <div style="color: red;">Unknown component: ${componentModel.type}</div>
      `;
		const context = new ComponentContext(surface, this.componentId, this.basePath);
		const buildChild = (childId, specificPath) => html`
      <cpk-a2ui-node
        .surface=${surface}
        .componentId=${childId}
        .basePath=${specificPath || context.dataContext.path}
      ></cpk-a2ui-node>
    `;
		return compImpl.render(context, buildChild);
	}
};

//#endregion
export { CpkA2uiNode };
//# sourceMappingURL=node.mjs.map