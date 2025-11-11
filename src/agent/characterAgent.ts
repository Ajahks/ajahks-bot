import {Message, Ollama} from "ollama";
import {AI_NAME, SEED_MEMORIES} from "../context/background";

export class CharacterAgent {
    private ollamaInstance: Ollama;

    constructor(instance: Ollama) {
        this.ollamaInstance = instance
    }

    async characterizeResponseMessage(responseMessage: string): Promise<string> {
        const messages: Message[]  = [
            { role: "system", content: this.generateSystemPrompt(responseMessage) },
        ]

        const response =  await this.ollamaInstance.chat({
            model: "qwen3:32b",
            messages: messages,
            think: true,
        })

        return response.message.content
    }

    async respondDirectlyToMessage(message: string) {
        const messages: Message[]  = [
            { role: "system", content: this.generateSystemPromptForDirectResponse() },
            { role: "user", content: message },
        ]

        const response =  await this.ollamaInstance.chat({
            model: "deepseek-r1:32b",
            messages: messages,
            think: true,
        })

        return response.message.content
    }

    private generateSystemPrompt(responseMessage: string) {
        const coreCharacteristics = SEED_MEMORIES.map(characteristic => {
            return `    - ${characteristic}`
        }).join("\n")
        return `
            You are playing a character ${AI_NAME} defined by these core characteristics:
            ${coreCharacteristics}
            
            
            Please convert the following message as if you as the character were ${AI_NAME} saying that message in a text chat.
            IMPORTANT: Do not respond to/answer the message directly, instead you are converting the message as if it was coming directly from your character.
            Feel free to completely change the emotional tone of the message, or even modify the content of the message if the message is not appropriate for the character.
            Do not break character.
            No need to do any special formatting like surrounding quotes, just a plain text response is fine.
            The response should look like a normal text chat message.
            
            Message to Convert:
            ${responseMessage}
        `
    }

    private generateSystemPromptForDirectResponse() {
        const coreCharacteristics = SEED_MEMORIES.map(characteristic => {
            return `    - ${characteristic}`
        }).join("\n")
        return `
            You are playing a character defined by these core characteristics:
            ${coreCharacteristics}
            Please respond to the following user message as if you are ${AI_NAME}.
            Do not break character.
            No need to do any special formatting like surrounding quotes, just a plain text response is fine.
            The response should look like a normal text chat message.
        `
    }
}