import { createLitComponent } from "../../adapter.mjs";
import { getBaseLeafStyle } from "./utils.mjs";
import { html, nothing } from "lit";
import { AudioPlayerApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/audio-player.ts
const AudioPlayer = createLitComponent(AudioPlayerApi, ({ props }) => {
	const style = {
		...getBaseLeafStyle(),
		width: "100%"
	};
	return html`
    <div
      style=${styleMap({
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		width: "100%"
	})}
    >
      ${props.description ? html`<span style="font-size: 12px; color: #666;"
            >${props.description}</span
          >` : nothing}
      <audio src=${props.url ?? ""} controls style=${styleMap(style)}></audio>
    </div>
  `;
});

//#endregion
export { AudioPlayer };
//# sourceMappingURL=audio-player.mjs.map