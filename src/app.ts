import {Client, Events, GatewayIntentBits} from 'discord.js';
import { bot_token } from '../config/discord/config.json';
import {ChatMessageFixedQueue} from "./llm/persistence/chatMessageFixedQueue";
import {ChatMessage} from "./llm/persistence/types/chatMessage";
import {OllamaChatBot} from "./llm/ollamaChatBot";
import {LocalOllama} from "./llm/localOllama";
import {OllamaEmbedder} from "./llm/rag/ollamaEmbedder";
import {VectorDB} from "./llm/rag/vectorDb";
import {splitReasoningResponse} from "./llm/reasoningModelResponseUtils";

const lastMessageHistory: ChatMessageFixedQueue = new ChatMessageFixedQueue(20);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});


const ollamaInstance = new LocalOllama();
const embedder = new OllamaEmbedder(ollamaInstance.instance);
const vectorDb = new VectorDB();
const chatBot = new OllamaChatBot(ollamaInstance.instance, embedder, vectorDb);

vectorDb.readDbFromDisk();
client.login(bot_token);

client.on(Events.MessageCreate, async (message) => {
    console.log(`Message found! ${message}`)
    if (message.author.bot) return false;

    if (message.mentions.has(client.user!.id)) {
        chatBot.chat(message).then(response => {
            if (response != null) {
                const receivedMessage: ChatMessage = {
                    userId: message.author.username,
                    userName: message.author.displayName,
                    message: message.content,
                }
                const responseMessage: ChatMessage = {
                    userId: client.user!.id,
                    userName: 'Dotto',
                    message: splitReasoningResponse(response.message.content).message,
                }
                lastMessageHistory.enqueue(receivedMessage)
                lastMessageHistory.enqueue(responseMessage)
                message.channel.send(responseMessage.message)
            }
        });
    }
});
