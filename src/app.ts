import {Client, Events, GatewayIntentBits, Message} from 'discord.js';
import { bot_token } from '../config/discord/config.json';
import { API_KEY } from '../config/groq/config.json'
import { BACKGROUND_CONTEXT } from './context/background';
import { Groq } from 'groq-sdk'
import {getDotaLastMatchesSummary, getLastDotaMatchData} from "./dota/openDotaApiCaller";

const initialPrompt = `You are roleplaying as Ajahks, otherwise known as Arren or AJ in real life.`

let lastMessageHistory: string = "";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(bot_token);

const groq = new Groq({
    apiKey: API_KEY
});

client.on(Events.MessageCreate, async (message) => {
    console.log(`Message found! ${message}`)
    if (message.author.bot) return false;

    if (message.mentions.has(client.user!.id)) {
        const requestContext = await generateHandledRequestContext(message);

        generateResponse(message.author.username, message.content, requestContext).then(response => {
            if (response != null) {
                lastMessageHistory += `${message.author.username}: ${message.content}\n"Ajahks": ${response}\n`
                message.channel.send(response)
            }
        });
    }
});

async function generateHandledRequestContext(message: Message): Promise<string> {
    let requestContext = ''
    const messageContent = message.content.toLowerCase();
    if (messageContent.indexOf('last matches') != -1 || messageContent.indexOf('last games') != -1) {
        console.log('Found request for last matches')
        const lastMatchesData = await getDotaLastMatchesSummary()
        requestContext = `Last 10 dota matches data + ${JSON.stringify(lastMatchesData)}`
        console.log(`Request Context: ${requestContext}`)
    }
    else if (messageContent.indexOf('last match') != -1 || messageContent.indexOf('last game') != -1) {
        console.log('Found request for last match')
        const lastMatchData = await getLastDotaMatchData()
        requestContext = `Last dota match data + ${JSON.stringify(lastMatchData)}`
        console.log(`Request Context: ${requestContext}`)
    }

    return requestContext
}

async function generateResponse(user: string, message: string, requestContext: string) {
    const chatCompletion = await groq.chat.completions.create({
        messages: [{ 
            role: 'user', 
            content: `${initialPrompt} 
            Here is specific handled request data, this data is key for answering the above question:
            #### BEGIN handled request data:
            ${requestContext} 
            
            #### END handled request data
            
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

            Please respond to the above message as Ajahks! You dont have to format your response similar to above, just the message is good enough!  Please use the handled request data if there is some!
            ` 
        }],
        model: 'llama3-8b-8192'
    });

    return chatCompletion.choices[0].message.content;
}

