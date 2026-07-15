// src/streams/assistant-response.ts
import { formatStreamPart } from "@copilotkit/shared";
function experimental_AssistantResponse({ threadId, messageId }, process) {
  const stream = new ReadableStream({
    async start(controller) {
      const textEncoder = new TextEncoder();
      const sendMessage = (message) => {
        controller.enqueue(textEncoder.encode(formatStreamPart("assistant_message", message)));
      };
      const sendError = (errorMessage) => {
        controller.enqueue(textEncoder.encode(formatStreamPart("error", errorMessage)));
      };
      controller.enqueue(
        textEncoder.encode(
          formatStreamPart("assistant_control_data", {
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

export {
  experimental_AssistantResponse
};
//# sourceMappingURL=chunk-ASCS5UEQ.mjs.map