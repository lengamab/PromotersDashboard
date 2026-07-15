import { LitComponentImplementation } from "../../types.mjs";
import { Button, ButtonApiDef, ButtonSchema } from "./button.mjs";
import { Column, ColumnApiDef, ColumnSchema } from "./column.mjs";
import { Row, RowApiDef, RowSchema } from "./row.mjs";
import { Text, TextApiDef, TextSchema } from "./text.mjs";
import { TextField, TextFieldApiDef, TextFieldSchema } from "./text-field.mjs";
import { minimalComponents } from "./components.mjs";
import { Catalog } from "@a2ui/web_core/v0_9";

//#region src/web-components/catalog/minimal/index.d.ts
declare namespace index_d_exports {
  export { Button, ButtonApiDef, ButtonSchema, Column, ColumnApiDef, ColumnSchema, Row, RowApiDef, RowSchema, Text, TextApiDef, TextField, TextFieldApiDef, TextFieldSchema, TextSchema, minimalCatalog, minimalComponents };
}
declare const minimalCatalog: Catalog<LitComponentImplementation>;
//#endregion
export { index_d_exports, minimalCatalog };
//# sourceMappingURL=index.d.mts.map