//#region src/web-components/catalog/basic/ids.ts
let idCounter = 0;
function uniqueId(prefix) {
	idCounter += 1;
	return `cpk-a2ui-${prefix}-${idCounter}`;
}

//#endregion
export { uniqueId };
//# sourceMappingURL=ids.mjs.map