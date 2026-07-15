
//#region src/web-components/catalog/children.ts
function renderChildList(childList, buildChild) {
	if (!Array.isArray(childList)) return [];
	return childList.map((item) => {
		if (item && typeof item === "object" && "id" in item) {
			const node = item;
			return buildChild(node.id, node.basePath);
		}
		if (typeof item === "string") return buildChild(item);
		return null;
	}).filter(Boolean);
}

//#endregion
exports.renderChildList = renderChildList;
//# sourceMappingURL=children.cjs.map