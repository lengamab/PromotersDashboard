import { createLitComponent } from "../../adapter.mjs";
import { getBaseLeafStyle } from "./utils.mjs";
import { html } from "lit";
import { VideoApi } from "@a2ui/web_core/v0_9/basic_catalog";
import { styleMap } from "lit/directives/style-map.js";

//#region src/web-components/catalog/basic/video.ts
const Video = createLitComponent(VideoApi, ({ props }) => html`
  <video
    src=${props.url ?? ""}
    controls
    style=${styleMap({
	...getBaseLeafStyle(),
	width: "100%",
	aspectRatio: "16/9"
})}
  ></video>
`);

//#endregion
export { Video };
//# sourceMappingURL=video.mjs.map