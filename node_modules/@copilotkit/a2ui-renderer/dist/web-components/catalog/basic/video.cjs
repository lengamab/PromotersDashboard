const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/video.ts
const Video = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.VideoApi, ({ props }) => lit.html`
  <video
    src=${props.url ?? ""}
    controls
    style=${(0, lit_directives_style_map_js.styleMap)({
	...require_utils.getBaseLeafStyle(),
	width: "100%",
	aspectRatio: "16/9"
})}
  ></video>
`);

//#endregion
exports.Video = Video;
//# sourceMappingURL=video.cjs.map