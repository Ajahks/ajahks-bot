import {ChatMessage} from "../llm/persistence/chat/chatMessage";
import {AnyChannel} from "../llm/ollamaChatBot";
import {getMemoryTypeName, MemoryType, MemoryV2} from "../llm/persistence/memory/v2/memoryV2";
import {Ollama} from "ollama";
import {OllamaEmbedder} from "../llm/rag/ollamaEmbedder";
import {OllamaSummarizer} from "../llm/rag/summarizer/ollamaSummarizer";
import {ImportanceRater} from "../llm/persistence/memory/v2/importanceRater";
import {VectorDB} from "../llm/rag/vectorDb";
import {ChatMessageKnowledgeBase} from "../llm/persistence/memory/v1/chatMessageKnowledgeBase";
import {MemoryStream} from "../llm/persistence/memory/v2/memoryStream";
import {ShortTermMemory} from "../llm/persistence/memory/v2/shortTermMemory";
import {ReflectionGenerator} from "../llm/persistence/memory/v2/reflectionGenerator";

export class AgentOrchestrator {
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

    async chat(message: ChatMessage, channel: AnyChannel): Promise<ChatMessage> {
        // Data Gathering
        // Call memory agent/tool to get a list of relevant memories
        const newMemory = await this.generateMemoryFromChatMessage(message, MemoryType.OBSERVATION);
        const relevantMemories = this.memoryStream.retrieveRelevantMemories(newMemory, 17, new Date(message.timestamp), 20);
        const relevantMemoriesString = relevantMemories.map(memory => {
            return `    - (${getMemoryTypeName(memory.memoryType)}) ${memory.getMemoryDescriptionWithFormattedDate()}`
        }).join("\n");

        // Response Forming
        // Call ResponseAgent to respond to the chat message given the data above

        // Character transformation
        // Call CharacterAgent to convert the response into a response given by the character with the described core attributes

        // Return character agent response
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
}