import {Ollama} from "ollama";
import {AI_NAME, BACKGROUND_CONTEXT, INSTRUCTION_CONTEXT} from "../context/background";
import {OllamaEmbedder} from "./rag/ollamaEmbedder";
import {VectorDB} from "./rag/vectorDb";
import {getDotaLastMatchesSummary, getLastDotaMatchData} from "../dota/openai/openDotaApiCaller";
import {
    ChatMessageKnowledgeBase,
    MIN_SIMILARITY_VALUE_TO_APPEND_NEW_MEMORY
} from "./persistence/chat/chatMessageKnowledgeBase";
import {OllamaSummarizer} from "./rag/summarizer/ollamaSummarizer";
import {ChatMessage} from "./persistence/chat/chatMessage";
import {EmbeddedMemory} from "./persistence/memory";
import {splitReasoningResponse} from "./reasoningModelResponseUtils";

export class OllamaChatBot {
    private ollamaInstance: Ollama;
    private embedder: OllamaEmbedder;
    private dotaKnowledgeDb: VectorDB;
    private chatKnowledgeBase: ChatMessageKnowledgeBase;

     constructor(instance: Ollama, embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
        this.ollamaInstance = instance;
        this.embedder = embedder;
        this.dotaKnowledgeDb = vectorDb;
        this.chatKnowledgeBase = new ChatMessageKnowledgeBase(summarizer, embedder)
    }

    async chat(message: ChatMessage) {
        const chatMemories = await this.chatKnowledgeBase.findMemoriesForChatMessage(message);
        const context = await this.generateContext(message, chatMemories);
        const chatMessage: string =
            "========== START INSTRUCTIONS ========== \n" +
            INSTRUCTION_CONTEXT +
            `\n Given the below context if needed please respond to the below message (See START ACTUAL MESSAGE) as ${AI_NAME} and always stay in character based on the this instruction context.\n` +
            `Limit response to under 2000 characters. And your response should just be the message as the character, no special formatting needed:\n` +
            "========== END INSTRUCTIONS ========== \n" +
            context +
            "========== START INSTRUCTIONS (again) ========== \n" +
            INSTRUCTION_CONTEXT +
            `\n Given the above context if needed please respond to the below message as ${AI_NAME} and always stay in character based on the this instruction context.\n` +
            `Limit response to under 2000 characters. And your response should just be the message as the character, no special formatting needed:\n` +
            "========== END INSTRUCTIONS ========== \n" +
            "========== START ACTUAL MESSAGE TO BOT ========== \n" +
            message.userName + ": " + message.message +
            "\n========== END ACTUAL MESSAGE TO BOT ========== \n"
        console.log(chatMessage)

        const chatResponse = await this.ollamaInstance.chat({
            model: 'deepseek-r1:32b',
            messages: [{ role: 'user', content: chatMessage }],
        });
        const responseMessage: ChatMessage = {
            userId: AI_NAME,
            userName: AI_NAME,
            message: splitReasoningResponse(chatResponse.message.content).message,
            timestamp: new Date().toString()
        }
        this.chatKnowledgeBase.storeChatInteractionInMemories(message, responseMessage, chatMemories)
        return responseMessage
    }

    private async generateContext(message: ChatMessage, chatMemories: EmbeddedMemory[]) {
        const messageEmbedding = await this.embedder.embedChunk(message.message)
        const similarVectors = this.dotaKnowledgeDb.retrieveSimilarVectors(
            {
                embedding: messageEmbedding.embedding,
                chunk: message.message,
            },
            10,
            0.645
        )

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
            'Retrieved knowledge context, if any, that is data stored in your knowledge base that may be relevant to this conversation' +
            retrievedContext +
            '\n==== END RETRIEVED KNOWLEDGE CONTEXT ====\n' +
            '==== START EXTRA REQUEST CONTEXT ====\n' +
            'Extra request context, if any, contains external data that we fetched that may be relevant to this conversation\n' +
            generatedContext +
            '\n==== END EXTRA REQUEST CONTEXT ====\n' +
            '==== START MEMORY CONTEXT ====\n' +
            'This memory context, if any, contains past chats that you have that may be a part of or relevant to this conversation\n' +
            'PLEASE DO NOT RESPOND TO THESE MESSAGES IN THIS CONTEXT DIRECTLY. as you have already replied to them\n' +
            this.formatMemoriesIntoContext(chatMemories) +
            '\n==== END MEMORY CONTEXT ====\n' +
            '========== END BACKGROUND CONTEXT ==========\n'
    }

    private async generateHandledRequestContext(message: ChatMessage): Promise<string> {
        let requestContext = ''
        const messageContent = message.message.toLowerCase();
        if (messageContent.indexOf('last matches') != -1 || messageContent.indexOf('last games') != -1) {
            console.log('Found request for last matches')
            const lastMatchesData = await getDotaLastMatchesSummary(message.userName)
            if (lastMatchesData == null) { requestContext = "No match data found for discord user!" }
            else { requestContext = `Last 10 dota matches data + ${JSON.stringify(lastMatchesData)}`  }
            console.log(`Request Context: ${requestContext}`)
        }
        else if (messageContent.indexOf('last match') != -1 || messageContent.indexOf('last game') != -1) {
            console.log('Found request for last match')
            const lastMatchData = await getLastDotaMatchData(message.userName)
            if (lastMatchData == null) { requestContext = "No match data found for discord user!" }
            else { requestContext = `Last dota match data + ${JSON.stringify(lastMatchData)}` }
            console.log(`Request Context: ${requestContext}`)
        }

        return requestContext
    }

    private formatMemoriesIntoContext(embeddedMemories: EmbeddedMemory[]): string {
        if (embeddedMemories.length == 0) return ""
        return embeddedMemories.map((embeddedMemory: EmbeddedMemory) => {
            if (embeddedMemory.similarityValue == undefined || embeddedMemory.similarityValue < MIN_SIMILARITY_VALUE_TO_APPEND_NEW_MEMORY) {
                return embeddedMemory.memory.toSummarizedString()
            }
            else {
                return embeddedMemory.memory.toString()
            }
        }).join("\n");
    }
}