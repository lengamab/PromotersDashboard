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

//#region src/web-components/catalog/basic/components.ts
const basicComponents = [
	require_text.Text,
	require_image.Image,
	require_icon.Icon,
	require_video.Video,
	require_audio_player.AudioPlayer,
	require_row.Row,
	require_column.Column,
	require_list.List,
	require_card.Card,
	require_tabs.Tabs,
	require_divider.Divider,
	require_modal.Modal,
	require_button.Button,
	require_text_field.TextField,
	require_check_box.CheckBox,
	require_choice_picker.ChoicePicker,
	require_slider.Slider,
	require_date_time_input.DateTimeInput
];

//#endregion
exports.basicComponents = basicComponents;
//# sourceMappingURL=components.cjs.map