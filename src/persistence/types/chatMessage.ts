export interface ChatMessage {
    readonly userId: string;
    readonly userName: string;
    readonly message: string;
}

export function convertChatMessageToFormattedString(chatMessage: ChatMessage): string {
    return `${chatMessage.userName}: ${chatMessage.message}`
}
