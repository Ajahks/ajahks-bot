import {Ollama} from "ollama";
import {BACKGROUND_CONTEXT} from "../context/background";
import {OllamaEmbedder} from "./rag/ollamaEmbedder";
import {VectorData, VectorDB} from "./rag/vectorDb";
import {Message} from "discord.js";
import {getDotaLastMatchesSummary, getLastDotaMatchData} from "../dota/openDotaApiCaller";

export class OllamaChatBot {
    private ollamaInstance: Ollama;
    private embedder: OllamaEmbedder;
    private vectorDb: VectorDB;

     constructor(instance: Ollama, embedder: OllamaEmbedder, vectorDb: VectorDB) {
        this.ollamaInstance = instance;
        this.embedder = embedder;
        this.vectorDb = vectorDb;
    }

    async chat(message: Message) {
        const messageEmbedding = await this.embedder.embedChunk(message.content)
        const similarVectors = this.vectorDb.retrieveSimilarVectors(
            {
                embedding: messageEmbedding.embedding,
                chunk: message.content,
            },
            20,
            0.63
        )

        const context = await this.generateContext(message, similarVectors)
        const chatMessage: string = context +
            "========== START ACTUAL MESSAGE TO BOT ========== \n" +
            message.content +
            "\n========== END ACTUAL MESSAGE TO BOT ========== \n" +
            "Given the above context if needed please respond to the above message as Ajahks in under 2000 characters: \n";
        console.log(chatMessage)

        return this.ollamaInstance.chat({
            model: 'deepseek-r1:32b',
            messages: [{ role: 'user', content: chatMessage }],
        });
    }

    private async generateContext(message: Message, similarVectors: VectorData[]) {
        let retrievedContext = "";
        if (similarVectors.length > 0) {
            retrievedContext = similarVectors.map((vectorData) => {
                return "= Start Retrieved Knowledge Chunk =\n" + vectorData.chunk + "\n= End Received Knowledge Chunk =\n"
            }).reduce((prev, next) => {
                return `${prev}\n${next}`
            });
        }

        const generatedContext = await this.generateHandledRequestContext(message)

        return '========== START CONTEXT ==========\n' +
            '==== START BACKGROUND CONTEXT AND GOAL ====\n' +
            BACKGROUND_CONTEXT +
            '\n==== END BACKGROUND CONTEXT AND GOAL ====\n' +
            '\n==== START RETRIEVED KNOWLEDGE CONTEXT ====\n' +
            retrievedContext +
            '\n==== END RETRIEVED KNOWLEDGE CONTEXT ====\n' +
            '==== START EXTRA REQUEST CONTEXT ====\n' +
            generatedContext +
            '\n==== END EXTRA REQUEST CONTEXT ====\n' +
            '========== END BACKGROUND CONTEXT ==========\n'

    }

    private async generateHandledRequestContext(message: Message): Promise<string> {
        let requestContext = ''
        const messageContent = message.content.toLowerCase();
        if (messageContent.indexOf('last matches') != -1 || messageContent.indexOf('last games') != -1) {
            console.log('Found request for last matches')
            const lastMatchesData = await getDotaLastMatchesSummary()
            requestContext = `Last 10 dota matches data + ${JSON.stringify(lastMatchesData)}`
            console.log(`Request Context: ${requestContext}`)
        }
        else if (messageContent.indexOf('last match') != -1 || messageContent.indexOf('last game') != -1) {
            console.log('Found request for last match')
            const lastMatchData = await getLastDotaMatchData()
            requestContext = `Last dota match data + ${JSON.stringify(lastMatchData)}`
            console.log(`Request Context: ${requestContext}`)
        }

        return requestContext
    }
}