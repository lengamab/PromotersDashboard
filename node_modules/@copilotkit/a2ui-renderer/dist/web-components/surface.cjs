const require_index = require('./catalog/basic/index.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");

//#region src/web-components/surface.ts
const DEFAULT_SURFACE_ID = "default";
const BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/basic_catalog.json";
function isRecord(value) {
	return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function getRecordProperty(record, key) {
	const value = record[key];
	return isRecord(value) ? value : void 0;
}
function getStringProperty(record, key) {
	const value = record[key];
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function getBooleanProperty(record, key) {
	const value = record[key];
	return typeof value === "boolean" ? value : void 0;
}
function getSurfaceId(payload) {
	return payload ? getStringProperty(payload, "surfaceId") ?? DEFAULT_SURFACE_ID : DEFAULT_SURFACE_ID;
}
function getOperationSurfaceId(operation) {
	if ("createSurface" in operation) return operation.createSurface.surfaceId;
	if ("updateComponents" in operation) return operation.updateComponents.surfaceId;
	if ("updateDataModel" in operation) return operation.updateDataModel.surfaceId;
	if ("deleteSurface" in operation) return operation.deleteSurface.surfaceId;
	return DEFAULT_SURFACE_ID;
}
function normalizeOperations(operations, catalogId) {
	return operations.flatMap((operation) => {
		if (!isRecord(operation)) return [];
		const createSurface = getRecordProperty(operation, "createSurface");
		if (createSurface) return [{
			version: "v0.9",
			createSurface: {
				surfaceId: getSurfaceId(createSurface),
				catalogId: getStringProperty(createSurface, "catalogId") ?? catalogId,
				theme: createSurface.theme ?? {},
				sendDataModel: getBooleanProperty(createSurface, "sendDataModel")
			}
		}];
		const updateComponents = getRecordProperty(operation, "updateComponents");
		if (updateComponents) {
			const components = updateComponents.components;
			return [{
				version: "v0.9",
				updateComponents: {
					surfaceId: getSurfaceId(updateComponents),
					components: Array.isArray(components) ? components.map(normalizeComponent) : []
				}
			}];
		}
		const updateDataModel = getRecordProperty(operation, "updateDataModel");
		if (updateDataModel) return [{
			version: "v0.9",
			updateDataModel: {
				surfaceId: getSurfaceId(updateDataModel),
				path: getStringProperty(updateDataModel, "path") ?? "/",
				value: updateDataModel.value
			}
		}];
		const deleteSurface = getRecordProperty(operation, "deleteSurface");
		if (deleteSurface) return [{
			version: "v0.9",
			deleteSurface: { surfaceId: getSurfaceId(deleteSurface) }
		}];
		const beginRendering = getRecordProperty(operation, "beginRendering");
		if (beginRendering) return [{
			version: "v0.9",
			createSurface: {
				surfaceId: getSurfaceId(beginRendering),
				catalogId,
				theme: beginRendering.styles ?? {},
				sendDataModel: getBooleanProperty(beginRendering, "sendDataModel")
			}
		}];
		const surfaceUpdate = getRecordProperty(operation, "surfaceUpdate");
		if (surfaceUpdate) {
			const components = surfaceUpdate.components;
			return [{
				version: "v0.9",
				updateComponents: {
					surfaceId: getSurfaceId(surfaceUpdate),
					components: Array.isArray(components) ? components.map(normalizeComponent) : []
				}
			}];
		}
		const dataModelUpdate = getRecordProperty(operation, "dataModelUpdate");
		if (dataModelUpdate) return [{
			version: "v0.9",
			updateDataModel: {
				surfaceId: getSurfaceId(dataModelUpdate),
				path: getStringProperty(dataModelUpdate, "path") ?? "/",
				value: dataModelUpdate.value ?? dataModelUpdate.contents
			}
		}];
		return [];
	});
}
function normalizeComponent(component) {
	if (!component || typeof component !== "object") return component;
	const record = component;
	if (!record.component || typeof record.component === "string") return record;
	const entries = Object.entries(record.component);
	if (entries.length !== 1) return record;
	const [componentName, props] = entries[0];
	return {
		id: record.id,
		component: componentName,
		...props && typeof props === "object" ? props : {}
	};
}
function toClientEventMessage(action) {
	const record = isRecord(action) ? action : {};
	return { userAction: {
		name: getStringProperty(record, "name") ?? "unknown",
		surfaceId: getStringProperty(record, "surfaceId") ?? DEFAULT_SURFACE_ID,
		sourceComponentId: getStringProperty(record, "sourceComponentId"),
		context: isRecord(record.context) ? record.context : {},
		timestamp: getStringProperty(record, "timestamp") ?? (/* @__PURE__ */ new Date()).toISOString(),
		dataContextPath: getStringProperty(record, "dataContextPath")
	} };
}
function defaultLoading() {
	return lit.html`
    <div
      class="cpk:flex cpk:flex-col cpk:gap-3 cpk:rounded-xl cpk:border cpk:border-gray-100 cpk:bg-gray-50/50 cpk:p-5"
      style="min-height: 120px;"
      data-testid="a2ui-loading"
    >
      <div class="cpk:flex cpk:items-center cpk:gap-2">
        <div
          class="cpk:h-3 cpk:w-3 cpk:rounded-full cpk:bg-gray-200"
          style="animation: cpk-a2ui-pulse 1.5s ease-in-out infinite;"
          data-testid="a2ui-loading-dot"
        ></div>
        <span class="cpk:text-xs cpk:font-medium cpk:text-gray-400">
          Generating UI...
        </span>
      </div>
      <div class="cpk:flex cpk:flex-col cpk:gap-2">
        ${[
		.8,
		.6,
		.4
	].map((width, i) => lit.html`
            <div
              class="cpk:h-3 cpk:rounded cpk:bg-gray-200/70"
              style=${`width: ${width * 100}%; animation: cpk-a2ui-pulse 1.5s ease-in-out ${i * .15}s infinite;`}
              data-testid="a2ui-loading-bar"
            ></div>
          `)}
      </div>
      <style>
        @keyframes cpk-a2ui-pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      </style>
    </div>
  `;
}
var CpkA2uiSurface = class extends lit.LitElement {
	constructor(..._args) {
		super(..._args);
		this.operations = [];
		this.processor = null;
		this.lastOpsHash = "";
		this.renderedSurfaceIds = [];
		this.error = null;
	}
	static {
		this.properties = {
			operations: { attribute: false },
			catalog: { attribute: false },
			theme: { attribute: false },
			surfaceId: { attribute: false },
			loadingComponent: { attribute: false }
		};
	}
	createRenderRoot() {
		return this;
	}
	willUpdate(changed) {
		if (changed.has("catalog")) {
			this.processor = null;
			this.processorCatalog = void 0;
			this.lastOpsHash = "";
			this.renderedSurfaceIds = [];
		}
		if (changed.has("operations") || changed.has("catalog") || changed.has("theme") || changed.has("surfaceId")) this.processOperations();
	}
	getCatalog() {
		return this.catalog ?? require_index.basicCatalog;
	}
	getProcessor() {
		const catalog = this.getCatalog();
		if (!this.processor || this.processorCatalog !== catalog) {
			this.processorCatalog = catalog;
			this.processor = new _a2ui_web_core_v0_9.MessageProcessor([catalog], (action) => {
				const message = toClientEventMessage(action);
				this.dispatchEvent(new CustomEvent("a2ui-action", {
					detail: message,
					bubbles: true,
					composed: true
				}));
			});
		}
		return this.processor;
	}
	processOperations() {
		if (!Array.isArray(this.operations) || this.operations.length === 0) {
			this.renderedSurfaceIds = [];
			this.error = null;
			return;
		}
		const catalogId = this.getCatalog().id || BASIC_CATALOG_ID;
		const normalized = normalizeOperations(this.operations, catalogId);
		const hash = JSON.stringify({
			operations: normalized,
			surfaceId: this.surfaceId,
			theme: this.theme
		});
		if (hash === this.lastOpsHash) return;
		this.lastOpsHash = hash;
		const grouped = /* @__PURE__ */ new Map();
		for (const operation of normalized) {
			const surfaceId = this.surfaceId ?? getOperationSurfaceId(operation);
			if (!grouped.has(surfaceId)) grouped.set(surfaceId, []);
			grouped.get(surfaceId).push(operation);
		}
		const processor = this.getProcessor();
		try {
			for (const [surfaceId, ops] of grouped) {
				const existing = processor.model.getSurface(surfaceId);
				let filtered = existing ? ops.filter((op) => !("createSurface" in op)) : ops;
				if (!existing && !filtered.some((op) => "createSurface" in op)) filtered = [{
					version: "v0.9",
					createSurface: {
						surfaceId,
						catalogId,
						theme: this.theme ?? {}
					}
				}, ...filtered];
				processor.processMessages(filtered);
			}
			this.renderedSurfaceIds = [...grouped.keys()];
			this.error = null;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.error = message;
			this.dispatchEvent(new CustomEvent("a2ui-error", {
				detail: {
					error: err,
					message
				},
				bubbles: true,
				composed: true
			}));
		}
	}
	render() {
		if (this.error) return lit.html`
        <div
          class="cpk:rounded-lg cpk:border cpk:border-red-200 cpk:bg-red-50 cpk:p-3 cpk:text-sm cpk:text-red-700"
        >
          A2UI render error: ${this.error}
        </div>
      `;
		if (!this.renderedSurfaceIds.length) return this.loadingComponent ? this.loadingComponent() : defaultLoading();
		const processor = this.getProcessor();
		return lit.html`
      <div
        class="cpk:flex cpk:min-h-0 cpk:flex-1 cpk:flex-col cpk:gap-6 cpk:overflow-auto cpk:py-6"
        data-testid="a2ui-activity-renderer"
      >
        ${this.renderedSurfaceIds.map((surfaceId) => {
			const surface = processor.model.getSurface(surfaceId);
			if (!surface) return lit.nothing;
			return lit.html`
            <div
              class="cpk:flex cpk:w-full cpk:flex-none cpk:flex-col cpk:gap-4"
              data-surface-id=${surfaceId}
            >
              <div
                class="a2ui-surface cpk:flex cpk:flex-1"
                data-surface-id=${surfaceId}
              >
                <cpk-a2ui-node
                  .surface=${surface}
                  .componentId=${"root"}
                  .basePath=${"/"}
                ></cpk-a2ui-node>
              </div>
            </div>
          `;
		})}
      </div>
    `;
	}
};

//#endregion
exports.CpkA2uiSurface = CpkA2uiSurface;
//# sourceMappingURL=surface.cjs.map