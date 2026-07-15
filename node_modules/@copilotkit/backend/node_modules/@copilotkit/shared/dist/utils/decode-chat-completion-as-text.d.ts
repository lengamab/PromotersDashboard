import { ChatCompletionEvent } from './decode-chat-completion.js';
import './parse-chat-completion.js';
import '../types/openai-assistant.js';

declare function decodeChatCompletionAsText(stream: ReadableStream<ChatCompletionEvent>): ReadableStream<string>;

export { decodeChatCompletionAsText };
