import {Ollama} from "ollama";
import {BACKGROUND_CONTEXT} from "../context/background";
import {OllamaEmbedder} from "./rag/ollamaEmbedder";
import {VectorData, VectorDB} from "./rag/vectorDb";

export class OllamaChatBot {
    private ollamaInstance: Ollama;
    private embedder: OllamaEmbedder;
    private vectorDb: VectorDB;

     constructor(instance: Ollama, embedder: OllamaEmbedder, vectorDb: VectorDB) {
        this.ollamaInstance = instance;
        this.embedder = embedder;
        this.vectorDb = vectorDb;
    }

    async chat(message: string) {
        const messageEmbedding = await this.embedder.embedChunk(message)
        const similarVectors = this.vectorDb.retrieveSimilarVectors(
            {
                embedding: messageEmbedding.embedding,
                chunk: message,
            },
            20
        )

        const context = this.generateContext(similarVectors)
        const chatMessage: string = context +
            "========== START ACTUAL MESSAGE TO BOT ========== \n" +
            message +
            "\n========== END ACTUAL MESSAGE TO BOT ========== \n" +
            "Given the above context please respond to the above message as Ajahks: \n";
        console.log(chatMessage)

        return this.ollamaInstance.chat({
            model: 'deepseek-r1:32b',
            messages: [{ role: 'user', content: chatMessage }],
        });
    }

    private generateContext(similarVectors: VectorData[]) {
        const retrievedContext = similarVectors.map((vectorData) => {
            return vectorData.chunk
        }).reduce((prev, next) => {
            return `${prev}\n${next}`
        });

        return '========== START BACKGROUND CONTEXT ==========\n' +
            '==== BACKGROUND CONTEXT AND GOAL ====\n' +
            BACKGROUND_CONTEXT +
            '\n==== END BACKGROUND CONTEXT AND GOAL ====\n' +
            '\n==== RETRIEVED KNOWLEDGE CONTEXT ====\n' +
            retrievedContext +
            '\n==== END RETRIEVED KNOWLEDGE CONTEXT ====\n' +
            '========== END BACKGROUND CONTEXT ==========\n'

    }
}