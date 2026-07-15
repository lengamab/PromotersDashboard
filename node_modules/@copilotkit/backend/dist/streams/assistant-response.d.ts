import { AssistantMessage } from '@copilotkit/shared';

declare function experimental_AssistantResponse({ threadId, messageId }: {
    threadId: string;
    messageId: string;
}, process: (stream: {
    threadId: string;
    messageId: string;
    sendMessage: (message: AssistantMessage) => void;
}) => Promise<void>): Response;

export { experimental_AssistantResponse };
