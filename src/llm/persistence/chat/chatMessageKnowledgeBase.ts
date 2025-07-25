import {VectorDB} from "../../rag/vectorDb";
import {OllamaSummarizer} from "../../rag/summarizer/ollamaSummarizer";
import {OllamaEmbedder} from "../../rag/ollamaEmbedder";
import {EmbeddedMemory, Memory} from "../memory";
import {ChatMessage, convertChatMessageToFormattedString} from "./chatMessage";
import {ChatInteractionFragment} from "./chatInteractionFragment";


export class ChatMessageKnowledgeBase {
    private readonly vectorDb: VectorDB = new VectorDB("./data/chatVectorDb.json");
    private readonly summarizer: OllamaSummarizer;
    private readonly embedder: OllamaEmbedder;

    constructor(summarizer: OllamaSummarizer, embedder: OllamaEmbedder) {
        this.summarizer = summarizer;
        this.embedder = embedder;
        this.vectorDb.readDbFromDisk();
    }

    async findMemoriesForChatMessage(message: ChatMessage): Promise<EmbeddedMemory[]> {
        const messageString = convertChatMessageToFormattedString(message);
        const chatEmbedding = (await this.embedder.embedChunk(messageString)).embedding;

        const similarVectors = this.vectorDb.retrieveSimilarVectors(
            {
                embedding: chatEmbedding,
                chunk: messageString
            },
            3,
            0.667
        );

        return similarVectors.map(vector => {
            const memory: Memory = Memory.fromJSON(vector.chunk)
            return {
                memory: memory,
                embedding: vector.embedding
            }
        });
    }

    async storeChatInteractionInMemories(userMessage: ChatMessage, botResponseMessage: ChatMessage, embeddedMemories: EmbeddedMemory[]) {
        const newFragment = new ChatInteractionFragment(userMessage, botResponseMessage);

        if (embeddedMemories.length == 0) {
            const newMemory = new Memory(
                [newFragment]
            );
            newMemory.setSummary(await newMemory.summarizeMemory(this.summarizer))
            const newEmbedding = (await this.embedder.embedChunk(newMemory.toString())).embedding

            this.vectorDb.addVector({
                embedding: newEmbedding,
                chunk: Memory.toJSON(newMemory)
            })
        }

        for (const embeddedMemory of embeddedMemories) {
            embeddedMemory.memory.addFragment(newFragment);
            embeddedMemory.memory.setSummary(await embeddedMemory.memory.summarizeMemory(this.summarizer));

            // generate new embedding for this memory
            const newEmbedding = (await this.embedder.embedChunk(embeddedMemory.memory.toString())).embedding

            // delete old memory from the vectodb
            this.vectorDb.removeEmbedding(embeddedMemory.embedding)

            // store new memory in the vectordb
            this.vectorDb.addVector({
                embedding: newEmbedding,
                chunk: Memory.toJSON(embeddedMemory.memory)
            })
        }

        this.vectorDb.saveDbToDisk();
    }
}