const require_button = require('./button.cjs');
const require_column = require('./column.cjs');
const require_row = require('./row.cjs');
const require_text = require('./text.cjs');
const require_text_field = require('./text-field.cjs');

//#region src/web-components/catalog/minimal/components.ts
const minimalComponents = [
	require_text.Text,
	require_button.Button,
	require_row.Row,
	require_column.Column,
	require_text_field.TextField
];

//#endregion
exports.minimalComponents = minimalComponents;
//# sourceMappingURL=components.cjs.map