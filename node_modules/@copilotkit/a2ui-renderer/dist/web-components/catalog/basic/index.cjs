const require_utils = require('./utils.cjs');
const require_audio_player = require('./audio-player.cjs');
const require_button = require('./button.cjs');
const require_card = require('./card.cjs');
const require_check_box = require('./check-box.cjs');
const require_choice_picker = require('./choice-picker.cjs');
const require_column = require('./column.cjs');
const require_date_time_input = require('./date-time-input.cjs');
const require_divider = require('./divider.cjs');
const require_icon = require('./icon.cjs');
const require_image = require('./image.cjs');
const require_list = require('./list.cjs');
const require_modal = require('./modal.cjs');
const require_row = require('./row.cjs');
const require_slider = require('./slider.cjs');
const require_tabs = require('./tabs.cjs');
const require_text = require('./text.cjs');
const require_text_field = require('./text-field.cjs');
const require_video = require('./video.cjs');
const require_components = require('./components.cjs');
let _a2ui_web_core_v0_9 = require("@a2ui/web_core/v0_9");
let _a2ui_web_core_v0_9_basic_catalog = require("@a2ui/web_core/v0_9/basic_catalog");

//#region src/web-components/catalog/basic/index.ts
const basicCatalog = new _a2ui_web_core_v0_9.Catalog("https://a2ui.org/specification/v0_9/basic_catalog.json", require_components.basicComponents, _a2ui_web_core_v0_9_basic_catalog.BASIC_FUNCTIONS);
const fullCatalog = basicCatalog;

//#endregion
exports.basicCatalog = basicCatalog;
exports.fullCatalog = fullCatalog;
//# sourceMappingURL=index.cjs.map