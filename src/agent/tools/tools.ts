import {Tool} from "ollama";
import {AI_NAME} from "../../context/background";

export const tools: Tool[] = [
    {
        type: 'function',
        function: {
            name: 'query_relevant_memories_for_strings',
            description: `
                Query relevant long term memories (both observed message summaries and reflections you have made) for the given string queries. 
                Returns a list of relevant observed memories and reflections you have made, each in formatted string form.  
                This tool should be invoked with 1-3 RAG queries that the agent would have to get more context on a given message.
                Be sure to include relevant names if necessary in your queries, such as the user sending the message, users mentioned in the message, your own name ${AI_NAME}, etc.
            `,
            parameters: {
                type: 'object',
                required: ['queries'],
                properties: {
                    queries: { type: 'array', description: 'Array of RAG queries to fetch relevant memories for', items: { type: 'string' } },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'retrieve_short_term_memories',
            description: `
                Retrieve the last few summarized messages (both received and sent) from short term memory for context leading up the the new message(s).
                Returns a list of summarized messages in order from oldest to newest leading up to the most recent message.
                Unlike long term memories, short term memories contain summarized messages sent by you as ${AI_NAME}, so you can see what you have already said in the recent past.
                Short term memories are also not yet stored in long term memory, it is very very important to retrieve short term memories for any context leading up to new messages, even if you think there is no needed context. 
                This tool should be invoked given new messages in order to get any relevant context leading up to the new message(s), like if the user is continuing a conversation.
            `,
            parameters: {
                type: 'object',
                required: [],
                properties: {},
            },
        },
    },
]
