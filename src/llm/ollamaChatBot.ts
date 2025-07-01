import {Ollama} from "ollama";
import {BACKGROUND_CONTEXT} from "../context/background";
import {getAllCurrentDotaStats} from "../dota/dotaKnowledgeProvider";

export class OllamaChatBot {
    private ollamaInstance: Ollama
    constructor(instance: Ollama) {
        this.ollamaInstance = instance
    }

    chat(message: string) {
        const context = this.generateContext()
        const chatMessage: string = context +
            "========== START ACTUAL MESSAGE TO BOT ========== \n" +
            message +
            "========== END ACTUAL MESSAGE TO BOT ========== \n" +
            "Given the above context please respond to the above message: \n"

        return this.ollamaInstance.chat({
            model: 'deepseek-r1:32b',
            messages: [{ role: 'user', content: chatMessage }],
        })
    }

    private generateContext() {
        return '========== START BACKGROUND CONTEXT ==========\n' +
            '==== BACKGROUND CONTEXT AND GOAL ====\n' +
            BACKGROUND_CONTEXT +
            '\n==== END BACKGROUND CONTEXT AND GOAL ====\n' +
            '\n==== DOTA KNOWLEDGE CONTEXT ====\n' +
            getAllCurrentDotaStats() +
            '\n==== END DOTA KNOWLEDGE CONTEXT ====\n' +
            '========== END BACKGROUND CONTEXT ==========\n'

    }
}