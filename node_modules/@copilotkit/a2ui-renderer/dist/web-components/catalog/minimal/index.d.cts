import { LitComponentImplementation } from "../../types.cjs";
import { Button, ButtonApiDef, ButtonSchema } from "./button.cjs";
import { Column, ColumnApiDef, ColumnSchema } from "./column.cjs";
import { Row, RowApiDef, RowSchema } from "./row.cjs";
import { Text, TextApiDef, TextSchema } from "./text.cjs";
import { TextField, TextFieldApiDef, TextFieldSchema } from "./text-field.cjs";
import { minimalComponents } from "./components.cjs";
import { Catalog } from "@a2ui/web_core/v0_9";

//#region src/web-components/catalog/minimal/index.d.ts
declare namespace index_d_exports {
  export { Button, ButtonApiDef, ButtonSchema, Column, ColumnApiDef, ColumnSchema, Row, RowApiDef, RowSchema, Text, TextApiDef, TextField, TextFieldApiDef, TextFieldSchema, TextSchema, minimalCatalog, minimalComponents };
}
declare const minimalCatalog: Catalog<LitComponentImplementation>;
//#endregion
export { index_d_exports, minimalCatalog };
//# sourceMappingURL=index.d.cts.map