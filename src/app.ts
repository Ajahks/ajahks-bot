import { Client, Events, GatewayIntentBits } from 'discord.js';
import { bot_token } from '../config/discord/config.json';
import { API_KEY } from '../config/groq/config.json'
import { BACKGROUND_CONTEXT } from './context/background';
import { Groq } from 'groq-sdk'

const initialPrompt = `You are roleplaying as Ajahks, otherwise known as Arren or AJ in real life.`

var lastMessageHistory: string = ""

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(bot_token);

const groq = new Groq({
    apiKey: API_KEY
});

client.on(Events.MessageCreate, (message) => {
    console.log(`Message found! ${message}`)
    if (message.author.bot) return false;

    if (message.mentions.has(client.user!!.id)) {
        generateResponse(message.author.username, message.content).then( response => {
            if (response != null) {
                lastMessageHistory += `${message.author.username}: ${message.content}\n"Ajahks": ${response}\n` 
                message.channel.send(response)
            }
        });
    }
});

async function generateResponse(user: string, message: string) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [{ 
            role: 'user', 
            content: `${initialPrompt} 
            Here is some background context:
            #### BEGIN background context after this line:
            ${BACKGROUND_CONTEXT}

            #### END background context

            Here is the last known message history of your conversations so far with the chat for extra context (format of USERNAME: MESSAGE):
            #### BEGIN message history for context
            ${lastMessageHistory}
            
            #### END message history for context

            Here is the new prompt for you to answer:
            #### BEGIN new message to respond to
            ${user}: ${message}

            #### END new message to respond to

            Please respond to the above message as Ajahks! You dont have to format your response similar to above, just the message is good enough!
            ` 
        }],
        model: 'llama3-8b-8192'
    });

    return chatCompletion.choices[0].message.content;
}

