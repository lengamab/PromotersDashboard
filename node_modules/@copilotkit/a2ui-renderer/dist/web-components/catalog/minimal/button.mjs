import { createLitComponent } from "../../adapter.mjs";
import { html } from "lit";
import { CommonSchemas } from "@a2ui/web_core/v0_9";
import { styleMap } from "lit/directives/style-map.js";
import { z } from "zod";

//#region src/web-components/catalog/minimal/button.ts
const ButtonSchema = z.object({
	child: CommonSchemas.ComponentId,
	action: CommonSchemas.Action,
	variant: z.enum(["primary", "borderless"]).optional()
});
const ButtonApiDef = {
	name: "Button",
	schema: ButtonSchema
};
const Button = createLitComponent(ButtonApiDef, ({ props, buildChild }) => html`
    <button
      type="button"
      style=${styleMap({
	padding: "8px 16px",
	cursor: "pointer",
	border: props.variant === "borderless" ? "none" : "1px solid #ccc",
	backgroundColor: props.variant === "primary" ? "#007bff" : "transparent",
	color: props.variant === "primary" ? "#fff" : "inherit",
	borderRadius: "4px"
})}
      @click=${() => props.action?.()}
    >
      ${props.child ? buildChild(props.child) : null}
    </button>
  `);

//#endregion
export { Button, ButtonApiDef, ButtonSchema };
//# sourceMappingURL=button.mjs.map