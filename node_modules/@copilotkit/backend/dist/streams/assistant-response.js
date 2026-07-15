"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/streams/assistant-response.ts
var assistant_response_exports = {};
__export(assistant_response_exports, {
  experimental_AssistantResponse: () => experimental_AssistantResponse
});
module.exports = __toCommonJS(assistant_response_exports);
var import_shared = require("@copilotkit/shared");
function experimental_AssistantResponse({ threadId, messageId }, process) {
  const stream = new ReadableStream({
    async start(controller) {
      const textEncoder = new TextEncoder();
      const sendMessage = (message) => {
        controller.enqueue(textEncoder.encode((0, import_shared.formatStreamPart)("assistant_message", message)));
      };
      const sendError = (errorMessage) => {
        controller.enqueue(textEncoder.encode((0, import_shared.formatStreamPart)("error", errorMessage)));
      };
      controller.enqueue(
        textEncoder.encode(
          (0, import_shared.formatStreamPart)("assistant_control_data", {
            threadId,
            messageId
          })
        )
      );
      try {
        await process({
          threadId,
          messageId,
          sendMessage
        });
      } catch (error) {
        sendError(error.message ?? `${error}`);
      } finally {
        controller.close();
      }
    },
    pull(controller) {
    },
    cancel() {
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  experimental_AssistantResponse
});
//# sourceMappingURL=assistant-response.js.map