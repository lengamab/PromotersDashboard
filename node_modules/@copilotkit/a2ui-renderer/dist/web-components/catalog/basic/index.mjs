import { LEAF_MARGIN, STANDARD_BORDER, STANDARD_RADIUS, getBaseContainerStyle, getBaseLeafStyle, mapAlign, mapJustify } from "./utils.mjs";
import { AudioPlayer } from "./audio-player.mjs";
import { Button } from "./button.mjs";
import { Card } from "./card.mjs";
import { CheckBox } from "./check-box.mjs";
import { ChoicePicker } from "./choice-picker.mjs";
import { Column } from "./column.mjs";
import { DateTimeInput } from "./date-time-input.mjs";
import { Divider } from "./divider.mjs";
import { Icon } from "./icon.mjs";
import { Image } from "./image.mjs";
import { List } from "./list.mjs";
import { Modal } from "./modal.mjs";
import { Row } from "./row.mjs";
import { Slider } from "./slider.mjs";
import { Tabs } from "./tabs.mjs";
import { Text } from "./text.mjs";
import { TextField } from "./text-field.mjs";
import { Video } from "./video.mjs";
import { basicComponents } from "./components.mjs";
import { Catalog } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS } from "@a2ui/web_core/v0_9/basic_catalog";

//#region src/web-components/catalog/basic/index.ts
const basicCatalog = new Catalog("https://a2ui.org/specification/v0_9/basic_catalog.json", basicComponents, BASIC_FUNCTIONS);
const fullCatalog = basicCatalog;

//#endregion
export { basicCatalog, fullCatalog };
//# sourceMappingURL=index.mjs.map