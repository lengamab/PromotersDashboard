//#region src/web-components/catalog/minimal/utils.ts
const mapJustify = (justify) => {
	switch (justify) {
		case "center": return "center";
		case "end": return "flex-end";
		case "spaceAround": return "space-around";
		case "spaceBetween": return "space-between";
		case "spaceEvenly": return "space-evenly";
		case "stretch": return "stretch";
		default: return "flex-start";
	}
};
const mapAlign = (align) => {
	switch (align) {
		case "start": return "flex-start";
		case "center": return "center";
		case "end": return "flex-end";
		default: return "stretch";
	}
};

//#endregion
export { mapAlign, mapJustify };
//# sourceMappingURL=utils.mjs.map