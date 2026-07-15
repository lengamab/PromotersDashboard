import { ChatCompletionChunk, Message, ToolDefinition } from '@copilotkit/shared';

declare function writeChatCompletionChunk(controller: ReadableStreamDefaultController<any>, chunk: ChatCompletionChunk): void;
declare function writeChatCompletionContent(controller: ReadableStreamDefaultController<any>, content?: string, toolCalls?: any): void;
declare function writeChatCompletionResult(controller: ReadableStreamDefaultController<any>, functionName: string, result: any): void;
declare function writeChatCompletionEnd(controller: ReadableStreamDefaultController<any>): void;
declare function limitOpenAIMessagesToTokenCount(messages: Message[], tools: ToolDefinition[], maxTokens: number): Message[];
declare function maxTokensForOpenAIModel(model: string): number;

export { limitOpenAIMessagesToTokenCount, maxTokensForOpenAIModel, writeChatCompletionChunk, writeChatCompletionContent, writeChatCompletionEnd, writeChatCompletionResult };
