import {Client, Events, GatewayIntentBits} from 'discord.js';
import { bot_token } from '../config/discord/config.json';
import {ChatMessage} from "./llm/persistence/chat/chatMessage";
import {OllamaChatBot} from "./llm/ollamaChatBot";
import {LocalOllama} from "./llm/localOllama";
import {OllamaEmbedder} from "./llm/rag/ollamaEmbedder";
import {VectorDB} from "./llm/rag/vectorDb";
import {OllamaSummarizer} from "./llm/rag/summarizer/ollamaSummarizer";
import {ImportanceRater} from "./llm/persistence/memory/v2/importanceRater";
import {MemoryStream} from "./llm/persistence/memory/v2/memoryStream";
import {ReflectionGenerator} from "./llm/persistence/memory/v2/reflectionGenerator";
import {ShortTermMemory} from "./llm/persistence/memory/v2/shortTermMemory";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


const ollamaInstance = new LocalOllama();
const embedder = new OllamaEmbedder(ollamaInstance.instance);
const summarizer = new OllamaSummarizer(ollamaInstance.instance);
const importanceRater = ImportanceRater.init(ollamaInstance.instance);
const vectorDb = new VectorDB("./data/vectordb.json");
const memoryStream = new MemoryStream("./data/memoryV2Stream.json");
const shortTermMemory = new ShortTermMemory(6, "./data/shortTermMemory.json");
const reflectionGenerator = new ReflectionGenerator(ollamaInstance.instance, memoryStream, embedder, importanceRater);
const chatBot = new OllamaChatBot(
    ollamaInstance.instance,
    embedder,
    summarizer,
    importanceRater,
    vectorDb,
    memoryStream,
    shortTermMemory,
    reflectionGenerator
);
ImportanceRater.init(ollamaInstance.instance)

vectorDb.readDbFromDisk();
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

        chatBot.chat(receivedMessage, message.channel).then(response => {
            if (response != null) {
                message.channel.send(response.message)
            }
        });
    }
});
