import {Client, Events, GatewayIntentBits} from 'discord.js';
import { bot_token } from '../config/discord/config.json';
import {ChatMessage} from "./llm/persistence/chat/chatMessage";
import {OllamaChatBot} from "./llm/ollamaChatBot";
import {LocalOllama} from "./llm/localOllama";
import {OllamaEmbedder} from "./llm/rag/ollamaEmbedder";
import {VectorDB} from "./llm/rag/vectorDb";
import {OllamaSummarizer} from "./llm/rag/summarizer/ollamaSummarizer";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


const ollamaInstance = new LocalOllama();
const embedder = new OllamaEmbedder(ollamaInstance.instance);
const summarizer = new OllamaSummarizer(ollamaInstance.instance);
const vectorDb = new VectorDB("./data/vectordb.json");
const chatBot = new OllamaChatBot(ollamaInstance.instance, embedder, summarizer, vectorDb);

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
            timestamp: message.createdAt.toString()
        }

        chatBot.chat(receivedMessage).then(response => {
            if (response != null) {
                message.channel.send(response.message)
            }
        });
    }
});
