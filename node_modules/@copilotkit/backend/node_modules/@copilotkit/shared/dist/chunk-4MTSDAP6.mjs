// src/utils/decode-chat-completion-as-text.ts
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

export {
  decodeChatCompletionAsText
};
//# sourceMappingURL=chunk-4MTSDAP6.mjs.map