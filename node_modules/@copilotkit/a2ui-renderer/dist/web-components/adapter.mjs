import { html } from "lit";

//#region src/web-components/adapter.ts
function createLitComponent(api, renderFn, setupState) {
	return {
		name: api.name,
		schema: api.schema,
		render: (context, buildChild) => html`
      <cpk-a2ui-bound-component
        .api=${api}
        .context=${context}
        .buildChild=${buildChild}
        .renderFn=${renderFn}
        .setupState=${setupState}
      ></cpk-a2ui-bound-component>
    `
	};
}
function createBinderlessLitComponent(api, renderFn) {
	return {
		name: api.name,
		schema: api.schema,
		render: (context, buildChild) => renderFn({
			context,
			buildChild
		})
	};
}

//#endregion
export { createBinderlessLitComponent, createLitComponent };
//# sourceMappingURL=adapter.mjs.map