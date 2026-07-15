const require_adapter = require('../../adapter.cjs');
const require_utils = require('./utils.cjs');
let lit = require("lit");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");
let lit_directives_style_map_js = require("lit/directives/style-map.js");

//#region src/web-components/catalog/basic/audio-player.ts
const AudioPlayer = require_adapter.createLitComponent(_a2ui_web_core_v0_9_basic_catalog.AudioPlayerApi, ({ props }) => {
	const style = {
		...require_utils.getBaseLeafStyle(),
		width: "100%"
	};
	return lit.html`
    <div
      style=${(0, lit_directives_style_map_js.styleMap)({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		width: "100%"
	})}
    >
      ${props.description ? lit.html`<span style="font-size: 12px; color: #666;"
            >${props.description}</span
          >` : lit.nothing}
      <audio src=${props.url ?? ""} controls style=${(0, lit_directives_style_map_js.styleMap)(style)}></audio>
    </div>
  `;
});

//#endregion
exports.AudioPlayer = AudioPlayer;
//# sourceMappingURL=audio-player.cjs.map