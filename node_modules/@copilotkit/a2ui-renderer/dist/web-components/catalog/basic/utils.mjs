//#region src/web-components/catalog/basic/utils.ts
const LEAF_MARGIN = "8px";
const CONTAINER_PADDING = "16px";
const STANDARD_BORDER = "1px solid #ccc";
const STANDARD_RADIUS = "8px";
const mapJustify = (j) => {
	switch (j) {
		case "center": return "center";
		case "end": return "flex-end";
		case "spaceAround": return "space-around";
		case "spaceBetween": return "space-between";
		case "spaceEvenly": return "space-evenly";
		case "start": return "flex-start";
		case "stretch": return "stretch";
		default: return "flex-start";
	}
};
const mapAlign = (a) => {
	switch (a) {
		case "start": return "flex-start";
		case "center": return "center";
		case "end": return "flex-end";
		case "stretch": return "stretch";
		default: return "stretch";
	}
};
const getBaseLeafStyle = () => ({
	margin: LEAF_MARGIN,
	boxSizing: "border-box"
});
const getBaseContainerStyle = () => ({
	margin: LEAF_MARGIN,
	padding: CONTAINER_PADDING,
	border: STANDARD_BORDER,
	borderRadius: STANDARD_RADIUS,
	boxSizing: "border-box"
});

//#endregion
export { LEAF_MARGIN, STANDARD_BORDER, STANDARD_RADIUS, getBaseContainerStyle, getBaseLeafStyle, mapAlign, mapJustify };
//# sourceMappingURL=utils.mjs.map