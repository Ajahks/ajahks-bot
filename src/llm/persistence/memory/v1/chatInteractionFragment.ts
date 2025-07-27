import {ChatMessage, convertChatMessageToFormattedString} from "../../chat/chatMessage";

export interface ChatInteractionFragmentData {
    timestamp: string;
    userMessage: ChatMessage;
    botResponseMessage: ChatMessage;
}

/**
 * A chat message fragment is a fragment that contains just a message from the user and the reply that the bot gave.
 */
export class ChatInteractionFragment {
    timestamp: string;
    userMessage: ChatMessage;
    botResponseMessage: ChatMessage;

    constructor(userMessage: ChatMessage, botResponseMessage: ChatMessage) {
        this.userMessage = userMessage;
        this.botResponseMessage = botResponseMessage;
        this.timestamp = userMessage.timestamp;
    }

    toString() {
        return `${convertChatMessageToFormattedString(this.userMessage)}\n${convertChatMessageToFormattedString(this.botResponseMessage)}`;
    }

    static fromObject(obj: ChatInteractionFragmentData) {
        return new ChatInteractionFragment(obj.userMessage, obj.botResponseMessage)
    }
}