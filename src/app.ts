import {Client, Events, GatewayIntentBits} from 'discord.js';
import { bot_token } from '../config/discord/config.json';
import {ChatMessage} from "./llm/persistence/chat/chatMessage";
import {LocalOllama} from "./llm/localOllama";
import {OllamaEmbedder} from "./llm/rag/ollamaEmbedder";
import {OllamaSummarizer} from "./llm/rag/summarizer/ollamaSummarizer";
import {ImportanceRater} from "./llm/persistence/memory/v2/importanceRater";
import {MemoryStream} from "./llm/persistence/memory/v2/memoryStream";
import {ReflectionGenerator} from "./llm/persistence/memory/v2/reflectionGenerator";
import {ShortTermMemory} from "./llm/persistence/memory/v2/shortTermMemory";
import {AgentOrchestrator} from "./agent/agentOrchestrator";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


const ollamaInstance = new LocalOllama();
const embedder = new OllamaEmbedder(ollamaInstance.instance);
const summarizer = new OllamaSummarizer(ollamaInstance.instance);
const importanceRater = ImportanceRater.init(ollamaInstance.instance);
const memoryStream = new MemoryStream("./data/memoryV2Stream.json");
const shortTermMemory = new ShortTermMemory(6, "./data/shortTermMemory.json");
const reflectionGenerator = new ReflectionGenerator(ollamaInstance.instance, memoryStream, embedder, importanceRater);
const multiAgentChatBot = new AgentOrchestrator(
    ollamaInstance.instance,
    embedder,
    summarizer,
    importanceRater,
    memoryStream,
    shortTermMemory,
    reflectionGenerator
);
ImportanceRater.init(ollamaInstance.instance)

client.login(bot_token);

client.on(Events.MessageCreate, async (message) => {
    console.log(`Message found! ${message}`)
    if (message.author.bot) return false;

    if (message.mentions.has(client.user!.id)) {
        const receivedMessage: ChatMessage = {
            userId: message.author.username,
            userName: message.author.displayName,
            message: message.cleanContent,
            timestamp: message.createdAt.toISOString()
        }

        multiAgentChatBot.chat(receivedMessage, message.channel).then(response => {
            if (response != null) {
                message.channel.send(response.message)
            }
        });
    }
});
