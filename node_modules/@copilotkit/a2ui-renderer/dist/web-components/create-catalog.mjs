import { createLitComponent } from "./adapter.mjs";
import { basicCatalog } from "./catalog/basic/index.mjs";
import { Catalog } from "@a2ui/web_core/v0_9";
import { zodToJsonSchema } from "zod-to-json-schema";

//#region src/web-components/create-catalog.ts
const BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/basic_catalog.json";
/**
* Context description used to identify the A2UI component schema in RunAgentInput.context.
* Must match the constant in @ag-ui/a2ui-middleware so the middleware can overwrite
* a frontend-provided schema with a server-side one.
*/
const A2UI_SCHEMA_CONTEXT_DESCRIPTION = "A2UI Component Schema — available components for generating UI surfaces. Use these component names and properties when creating A2UI operations.";
function createCatalog(definitions, renderers, options) {
	const catalogId = options?.catalogId ?? "copilotkit://custom-catalog";
	const customComponents = [];
	for (const [name, def] of Object.entries(definitions)) {
		const api = {
			name,
			schema: def.props
		};
		const renderer = renderers[name];
		if (renderer === void 0) throw new Error(`Missing renderer for component "${name}"`);
		customComponents.push(createLitComponent(api, ({ props, buildChild, context }) => renderer({
			props,
			children: buildChild,
			dispatch: (action) => context.dispatchAction(action)
		})));
	}
	return new Catalog(catalogId, options?.includeBasicCatalog === true ? [...Array.from(basicCatalog.components.values()), ...customComponents] : customComponents, options?.includeBasicCatalog === true ? Array.from(basicCatalog.functions.values()) : []);
}
function extractSchema(definitions) {
	return Object.entries(definitions).map(([name, def]) => ({
		name,
		description: def.description,
		props: zodSchemaToSimpleObject(def.props)
	}));
}
function zodSchemaToSimpleObject(schema) {
	const shape = schema.shape;
	const properties = {};
	for (const [key, value] of Object.entries(shape)) {
		const zodValue = value;
		properties[key] = {
			type: zodValue._def?.typeName ?? "unknown",
			...zodValue.description ? { description: zodValue.description } : {}
		};
	}
	return {
		type: "object",
		properties
	};
}
function createA2UICatalog(components, options) {
	const definitions = {};
	const renderers = {};
	for (const [name, def] of Object.entries(components)) {
		definitions[name] = {
			props: def.props,
			description: def.description
		};
		renderers[name] = def.render;
	}
	return createCatalog(definitions, renderers, options);
}
function extractA2UISchema(components) {
	const definitions = {};
	for (const [name, def] of Object.entries(components)) definitions[name] = {
		props: def.props,
		description: def.description
	};
	return extractSchema(definitions);
}
function isCatalogContextValue(value) {
	return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" && "components" in value && value.components instanceof Map;
}
function resolveCatalog(catalog) {
	return isCatalogContextValue(catalog) ? catalog : basicCatalog;
}
function toJsonSchema(schema, options) {
	return zodToJsonSchema(schema, options);
}
function extendsBasicCatalog(catalog) {
	for (const name of basicCatalog.components.keys()) if (!catalog.components.has(name)) return false;
	return true;
}
function getCustomComponentNames(catalog) {
	const custom = [];
	for (const name of catalog.components.keys()) if (!basicCatalog.components.has(name)) custom.push(name);
	return custom;
}
function buildCatalogContextValue(catalog) {
	const resolved = resolveCatalog(catalog);
	const lines = ["Available A2UI catalog:"];
	if (resolved.id === BASIC_CATALOG_ID) {
		lines.push(`- ${resolved.id} (basic catalog)`);
		return lines.join("\n");
	}
	const isSuperset = extendsBasicCatalog(resolved);
	const customNames = getCustomComponentNames(resolved);
	lines.push(`- ${resolved.id}`);
	if (isSuperset) lines.push("  Extends the basic catalog with all standard components plus:");
	else {
		lines.push("  Custom catalog (does NOT include all basic components).");
		lines.push("  Custom components:");
	}
	for (const name of customNames) {
		const component = resolved.components.get(name);
		if (!component) continue;
		const jsonSchema = toJsonSchema(component.schema);
		lines.push(`  - ${name}:`);
		lines.push(`    ${JSON.stringify(jsonSchema, null, 2).split("\n").join("\n    ")}`);
	}
	return lines.join("\n");
}
function extractCatalogComponentSchemas(catalog) {
	const resolved = resolveCatalog(catalog);
	const components = {};
	for (const [name, comp] of resolved.components) {
		const zodSchema = toJsonSchema(comp.schema, { target: "jsonSchema2019-09" });
		components[name] = { allOf: [{ $ref: "common_types.json#/$defs/ComponentCommon" }, {
			properties: {
				component: { const: name },
				...zodSchema.properties
			},
			required: ["component", ...zodSchema.required ?? []]
		}] };
	}
	return {
		catalogId: resolved.id,
		components
	};
}

//#endregion
export { A2UI_SCHEMA_CONTEXT_DESCRIPTION, buildCatalogContextValue, createA2UICatalog, createCatalog, extractA2UISchema, extractCatalogComponentSchemas, extractSchema };
//# sourceMappingURL=create-catalog.mjs.map