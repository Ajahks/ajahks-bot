import {ChatMessage} from "../llm/persistence/chat/chatMessage";
import {AnyChannel} from "../llm/ollamaChatBot";
import {getMemoryTypeName, MemoryType, MemoryV2} from "../llm/persistence/memory/v2/memoryV2";
import {Message, Ollama} from "ollama";
import {OllamaEmbedder} from "../llm/rag/ollamaEmbedder";
import {OllamaSummarizer} from "../llm/rag/summarizer/ollamaSummarizer";
import {ImportanceRater} from "../llm/persistence/memory/v2/importanceRater";
import {VectorDB} from "../llm/rag/vectorDb";
import {ChatMessageKnowledgeBase} from "../llm/persistence/memory/v1/chatMessageKnowledgeBase";
import {MemoryStream} from "../llm/persistence/memory/v2/memoryStream";
import {ShortTermMemory} from "../llm/persistence/memory/v2/shortTermMemory";
import {ReflectionGenerator} from "../llm/persistence/memory/v2/reflectionGenerator";
import {tools} from "./tools/tools";
import {AI_NAME} from "../context/background";
import {CharacterAgent} from "./characterAgent";
import {splitReasoningResponse} from "../llm/reasoningModelResponseUtils";

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
    private characterAgent: CharacterAgent;

    private MAX_NUM_MEMORIES = 30;

    // TODO: move this somewhere else
    private ROOT_AGENT_SYSTEM_INSTRUCTIONS = `
        You are an AI assistant named ${AI_NAME} that is able to generate responses to messages from users.
        You have the capabilities of long term memory via a memory stream that you can pull from via the query_relevant_memories_for_strings tool.
        Your long term memory includes summaries of messages that have been sent to you in the past.  As well as reflections that you have made over time based on the messages you have seen.
        Your long term memories may have key context on the user sending the message and/or the contents of the message.
        
        When a user sends a message, you will:
        1. Generate 0-3 RAG queries to fetch relevant memories of previous messages you may have received in the past from the memory stream. Be sure to include relevant names if necessary, such as the user sending the message, users mentioned in the message, your own name ${AI_NAME}, etc.
        2. Feed those queries to the 'query_relevant_memories_for_strings' tool to retrieve relevant memories.
        3. Call the 'retrieve_short_term_memories' tool to get more context on the last few messages that were sent. Short term memories are not always relevant, but they are not yet in long term memory, so they can be useful to provide context for the current message.
        4. Generate a response for the user message directly and reference any memories you see fit. Memories may not be present, which is fine. Short term memories may not always be relevant as conversations could shift. Also, try not to repeat yourself too much given the short term memories, especially when they are not relevant and you just said it recently, try to keep the conversation natural.
        
        No need for special formatting in your final response. Just respond as if you were sending a message in a text application.
    `


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
        this.characterAgent = new CharacterAgent(this.ollamaInstance)
    }

    async chat(message: ChatMessage, channel: AnyChannel): Promise<ChatMessage> {
        const formattedIncomingMessage = this.formatIncomingDiscordMessage(message)
        const messages: Message[]  = [
            { role: "system", content: this.ROOT_AGENT_SYSTEM_INSTRUCTIONS },
            { role: "user", content: formattedIncomingMessage}
        ]

        // 1. Ask the LLM to generate 0-3 questions to query for relevant memories and have it call the queryRelevantMemories tool with those questions (if there are some)
        const rootAgentResponse = await this.ollamaInstance.chat({
            model: "qwen3:32b",
            messages: messages,
            tools: tools,
            think: true,
        })
        messages.push(rootAgentResponse.message)

        const interval = setInterval(() => channel.sendTyping(), 1000);
        const agentResponse = await this.callAgentUntilToolsAreResolved(rootAgentResponse.message, messages);

        const responseMessage = agentResponse.content;
        console.log(`Unpersonalized response: ${responseMessage}`);

        // 3. Using the response from the llm in step 2, call the CharacterAgent to convert that message to a personalized message sent from the character
        const characterResponse = (responseMessage.length > 0) ? await this.characterAgent.characterizeResponseMessage(responseMessage) : await this.characterAgent.respondDirectlyToMessage(message.message)
        const characterResponseMessage: ChatMessage = {
            userId: AI_NAME,
            userName: AI_NAME,
            message: splitReasoningResponse(characterResponse).message,
            timestamp: new Date().toString()
        }
        console.log(`Characterized response: ${characterResponseMessage.message}`);
        clearInterval(interval)

        this.storeMessagesInMemory(message, characterResponseMessage);

        return characterResponseMessage
    }

    private async callAgentUntilToolsAreResolved(initialAgentResponse: Message, messages: Message[]) {
        let currentAgentResponse = initialAgentResponse;

        while (currentAgentResponse.tool_calls?.length ?? 0 > 0) {
            const toolCalls = currentAgentResponse.tool_calls ?? []
            console.log(`Tool calls found: ${JSON.stringify(toolCalls)}`)

            for (const call of toolCalls) {
                switch (call.function.name) {
                    case 'query_relevant_memories_for_strings': {
                        const args = call.function.arguments as { queries: string[] };
                        const embeddings = (await this.embedder.embedChunks(args.queries)).embeddings;
                        const memories = await this.retrieveRelevantMemoriesForEmbeddings(embeddings);
                        console.log(`Retrieved long term memories: ${memories}`);
                        messages.push({
                            role: 'tool',
                            tool_name: call.function.name,
                            content: JSON.stringify(memories)
                        });
                        break;
                    }
                    case 'retrieve_short_term_memories': {
                        const shortTermMemoriesStrings = this.shortTermMemory.getShortTermMemoriesFormatedStrings();
                        console.log(`Retrieved short term memories: ${shortTermMemoriesStrings}`);
                        messages.push({
                            role: 'tool',
                            tool_name: call.function.name,
                            content: JSON.stringify(shortTermMemoriesStrings)
                        });
                        break;
                    }
                    default: {
                        console.log(`Unknown tool call: ${call.function.name}`);
                        break;
                    }
                }
            }

            // given the resolved tools, try to generate a response from the agent
            const response = await this.ollamaInstance.chat({
                model: "qwen3:32b",
                messages: messages,
                tools: tools,
                think: true,
            })
            currentAgentResponse = response.message;
        }
        return currentAgentResponse;
    }

    private formatIncomingDiscordMessage(message: ChatMessage): string {
        const formattedDate = new Date(message.timestamp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
        return `[${formattedDate}] ${message.userName}: ${message.message}`
    }

    private async retrieveRelevantMemoriesForEmbeddings(embeddings: number[][]) {
        const relevantMemories = embeddings.map(embedding => {
            return this.memoryStream.queryRelevantMemories(
                embedding,
                17,
                new Date(),
                this.MAX_NUM_MEMORIES / embeddings.length
            )
        }).flat();

        const relevantMemoriesString = relevantMemories.map(memory => {
            return `(${getMemoryTypeName(memory.memoryType)}) ${memory.getMemoryDescriptionWithFormattedDate()}`
        })

        // Dedupe the duplicate memories
        return [...new Set(relevantMemoriesString)];
    }

    private storeMessagesInMemory(userMessage: ChatMessage, characterResponseMessage: ChatMessage) {
        // Memory storage - Store the original message as a summarized observation and store it in short term memory and long term memory
        const userMemory = this.generateMemoryFromChatMessage(userMessage, MemoryType.OBSERVATION)
        const botMemory = this.generateMemoryFromChatMessage(characterResponseMessage, MemoryType.BOT_MESSAGE)

        Promise.all([userMemory, botMemory]).then(async ([observedMessageMemory, botResponseMemory]) => {
            // Store the character message as a summarized bot message and store it in short term memory
            this.pushMemory(observedMessageMemory).then(() => {
                // push the bot message memory, we dont want some kind of race condition where the short term memory becomes out of order
                this.pushMemory(botResponseMemory, true)
            })
            this.pushMemoryToReflectionGeneratorAndGenerateIfAboveThreshold(observedMessageMemory, 15)
        })
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