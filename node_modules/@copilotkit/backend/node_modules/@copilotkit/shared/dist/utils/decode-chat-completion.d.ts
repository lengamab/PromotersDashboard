import { ChatCompletionChunk } from './parse-chat-completion.js';
import '../types/openai-assistant.js';

interface ChatCompletionContentEvent {
    type: "content";
    content: string;
}
interface ChatCompletionPartialEvent {
    type: "partial";
    name: string;
    arguments: string;
}
interface ChatCompletionFunctionEvent {
    type: "function";
    name: string;
    arguments: any;
    scope: "client" | "server";
}
interface ChatCompletionResultEvent {
    type: "result";
    content: string;
    name: string;
}
type ChatCompletionEvent = ChatCompletionContentEvent | ChatCompletionPartialEvent | ChatCompletionFunctionEvent | ChatCompletionResultEvent;
declare function decodeChatCompletion(stream: ReadableStream<ChatCompletionChunk>): ReadableStream<ChatCompletionEvent>;

export { ChatCompletionContentEvent, ChatCompletionEvent, ChatCompletionFunctionEvent, ChatCompletionPartialEvent, ChatCompletionResultEvent, decodeChatCompletion };
