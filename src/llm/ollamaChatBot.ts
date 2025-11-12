import {Ollama} from "ollama";
import {AI_NAME, INSTRUCTION_CONTEXT} from "../context/background";
import {OllamaEmbedder} from "./rag/ollamaEmbedder";
import {VectorDB} from "./rag/vectorDb";
import {
    ChatMessageKnowledgeBase,
} from "./persistence/memory/v1/chatMessageKnowledgeBase";
import {OllamaSummarizer} from "./rag/summarizer/ollamaSummarizer";
import {ChatMessage} from "./persistence/chat/chatMessage";
import {splitReasoningResponse} from "./reasoningModelResponseUtils";
import {MemoryStream} from "./persistence/memory/v2/memoryStream";
import {ImportanceRater} from "./persistence/memory/v2/importanceRater";
import {getMemoryTypeName, MemoryType, MemoryV2} from "./persistence/memory/v2/memoryV2";
import {ReflectionGenerator} from "./persistence/memory/v2/reflectionGenerator";
import {
    DMChannel,
    NewsChannel,
    PartialDMChannel,
    PrivateThreadChannel,
    PublicThreadChannel,
    StageChannel,
    TextChannel,
    VoiceChannel
} from "discord.js";
import {ShortTermMemory} from "./persistence/memory/v2/shortTermMemory";

// Main alias
export type AnyChannel =
    | DMChannel
    | PartialDMChannel
    | NewsChannel
    | StageChannel
    | TextChannel
    | PublicThreadChannel<boolean>
    | PrivateThreadChannel
    | VoiceChannel;

export class OllamaChatBot {
    private ollamaInstance: Ollama;
    private embedder: OllamaEmbedder;
    private summarizer: OllamaSummarizer;
    private importanceRater: ImportanceRater;
    private dotaKnowledgeDb: VectorDB;
    private chatKnowledgeBase: ChatMessageKnowledgeBase;
    private memoryStream: MemoryStream;
    private shortTermMemory: ShortTermMemory;
    private reflectionGenerator: ReflectionGenerator;

     constructor(instance: Ollama, embedder: OllamaEmbedder, summarizer: OllamaSummarizer, importanceRater: ImportanceRater, vectorDb: VectorDB, memoryStream: MemoryStream, shortTermMemory: ShortTermMemory, reflectionGenerator: ReflectionGenerator) {
        this.ollamaInstance = instance;
        this.embedder = embedder;
        this.summarizer = summarizer;
        this.importanceRater = importanceRater;
        this.dotaKnowledgeDb = vectorDb;
        this.chatKnowledgeBase = new ChatMessageKnowledgeBase(summarizer, embedder);
        this.memoryStream = memoryStream;
        this.shortTermMemory = shortTermMemory;
        this.reflectionGenerator = reflectionGenerator;
    }

    async chat(message: ChatMessage, channel: AnyChannel) {
        const newMemory = await this.generateMemoryFromChatMessage(message, MemoryType.OBSERVATION);

        const relevantMemories = this.memoryStream.retrieveRelevantMemories(newMemory, 17, new Date(message.timestamp), 20);
        const relevantMemoriesString = relevantMemories.map(memory => {
            return `    - (${getMemoryTypeName(memory.memoryType)}) ${memory.getMemoryDescriptionWithFormattedDate()}`
        }).join("\n");

        const formattedDate = new Date(message.timestamp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
        const chatMessage: string =
            INSTRUCTION_CONTEXT + "\n" +
            "[Relevant long term memories (only reference these as you see fit)]:\n" +
            relevantMemoriesString + "\n\n" +
            `[Last ${this.shortTermMemory.size} message summaries (only reference these if they are relevant to the messsage to reply to, and try not to repeat yourself unless necessary)]:\n` +
            this.shortTermMemory.getShortTermMemoriesFormatedString() + "\n\n" +
            "[Message to respond to (Reply directly to this only)]: \n" +
            `  {${formattedDate}} ${message.userName}: ${message.message}`
        console.log(chatMessage)

        const interval = setInterval(() => channel.sendTyping(), 1000);
        const chatResponse = await this.ollamaInstance.chat({
            model: 'qwen3:32b',
            messages: [{ role: 'user', content: chatMessage }],
        });
        clearInterval(interval)
        const responseMessage: ChatMessage = {
            userId: AI_NAME,
            userName: AI_NAME,
            message: splitReasoningResponse(chatResponse.message.content).message,
            timestamp: new Date().toString()
        }

        this.pushMemory(newMemory).then (() => {
            this.generateMemoryFromChatMessage(responseMessage, MemoryType.BOT_MESSAGE).then (botMessageMemory => {
                this.pushMemory(botMessageMemory, true)
            });
        })
        this.pushMemoryToReflectionGeneratorAndGenerateIfAboveThreshold(newMemory, 15)

        return responseMessage
    }

    private async generateMemoryFromChatMessage(message: ChatMessage, memoryType: MemoryType): Promise<MemoryV2> {
        const userMessage = `Author:${message.userName}\nMessage: ${message.message}`;
        const messageSummary = await this.summarizer.summarizeMessage(userMessage);
        console.log(`Summarized message: ${messageSummary}`)
        const messageSummaryEmbedding = await this.embedder.embedChunk(messageSummary);
        const memoryImportance = await this.importanceRater.rateImportance(messageSummary);
        console.log(`Assigned importance: ${memoryImportance}`)
        return MemoryV2.newMemory(
            memoryType,
            messageSummary,
            messageSummaryEmbedding.embedding,
            [],
            memoryImportance
        )
    }

    private async pushMemoryToReflectionGeneratorAndGenerateIfAboveThreshold(memory: MemoryV2, thresholdToPerformReflection: number) {
        const numMemories = this.reflectionGenerator.pushMemory(memory)
        if (numMemories < thresholdToPerformReflection) return

        console.log("Reflection threshold reached, generating reflections!");
        // reflect and add to memories
        this.reflectionGenerator.reflectOnQueuedMemories().then(reflectionMemories => {
            reflectionMemories.forEach(reflectionMemory => {
                console.log(`Adding Reflection to memory: ${reflectionMemory.getMemoryDescription()}`)
                this.memoryStream.addMemory(reflectionMemory);
            })
            this.memoryStream.saveToDisk();
        })
    }

    private async pushMemory(memory: MemoryV2, shortTermOnly: boolean = false) {
        const evictedMemory = this.shortTermMemory.pushWithinBounds(memory);
        if (evictedMemory != null && !shortTermOnly) {
            this.memoryStream.addMemory(evictedMemory);
            this.memoryStream.saveToDisk()
        }
    }
}