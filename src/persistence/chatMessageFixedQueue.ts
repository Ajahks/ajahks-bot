import {ChatMessage, convertChatMessageToFormattedString} from "./types/chatMessage";

export class ChatMessageFixedQueue {
    private readonly maxMessages: number;
    private chatMessages: ChatMessage[] = [];

    constructor(maxMessages: number) {
        this.maxMessages = maxMessages;
    }

    enqueue(message: ChatMessage) {
        this.chatMessages.push(message);

        if (this.chatMessages.length > this.maxMessages) {
            // messages are usually in pairs (request and response) so lets dequeue 2 at a time for efficiency
            this.dequeue();
            this.dequeue();
        }
    }

    dequeue() {
        this.chatMessages.shift();
    }

    toFormattedString() {
        let output = "";
        this.chatMessages.forEach(chatMessage => {
            output += `${convertChatMessageToFormattedString(chatMessage)}\n`
        })

        return output
    }
}