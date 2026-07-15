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

// src/utils/decode-chat-completion-as-text.ts
var decode_chat_completion_as_text_exports = {};
__export(decode_chat_completion_as_text_exports, {
  decodeChatCompletionAsText: () => decodeChatCompletionAsText
});
module.exports = __toCommonJS(decode_chat_completion_as_text_exports);
function decodeChatCompletionAsText(stream) {
  const reader = stream.getReader();
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          if (value.type === "content") {
            controller.enqueue(value.content);
            continue;
          }
        } catch (error) {
          controller.error(error);
          return;
        }
      }
    },
    cancel() {
      reader.cancel();
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  decodeChatCompletionAsText
});
//# sourceMappingURL=decode-chat-completion-as-text.js.map