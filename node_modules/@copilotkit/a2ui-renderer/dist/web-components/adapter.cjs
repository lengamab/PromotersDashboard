let lit = require("lit");

//#region src/web-components/adapter.ts
function createLitComponent(api, renderFn, setupState) {
	return {
		name: api.name,
		schema: api.schema,
		render: (context, buildChild) => lit.html`
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
exports.createBinderlessLitComponent = createBinderlessLitComponent;
exports.createLitComponent = createLitComponent;
//# sourceMappingURL=adapter.cjs.map