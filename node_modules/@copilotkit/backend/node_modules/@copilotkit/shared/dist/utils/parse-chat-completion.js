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

// src/utils/parse-chat-completion.ts
var parse_chat_completion_exports = {};
__export(parse_chat_completion_exports, {
  parseChatCompletion: () => parseChatCompletion
});
module.exports = __toCommonJS(parse_chat_completion_exports);
function parseChatCompletion(stream) {
  const reader = stream.getReader();
  let buffer = new Uint8Array();
  async function cleanup(controller) {
    if (controller) {
      try {
        controller.close();
      } catch (_) {
      }
    }
    if (reader) {
      try {
        await reader.cancel();
      } catch (_) {
      }
    }
  }
  return new ReadableStream({
    async pull(controller) {
      while (true) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            await cleanup(controller);
            return;
          }
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;
          const valueString = new TextDecoder("utf-8").decode(buffer);
          const lines = valueString.split("\n").filter((line) => line.trim() !== "");
          buffer = !valueString.endsWith("\n") ? new TextEncoder().encode(lines.pop() || "") : new Uint8Array();
          for (const line of lines) {
            const cleanedLine = line.replace(/^data: /, "");
            if (cleanedLine === "[DONE]") {
              await cleanup(controller);
              return;
            }
            const json = JSON.parse(cleanedLine);
            controller.enqueue(json);
          }
        } catch (error) {
          controller.error(error);
          await cleanup(controller);
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
  parseChatCompletion
});
//# sourceMappingURL=parse-chat-completion.js.map