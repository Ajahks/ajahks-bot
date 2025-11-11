export interface ToolParameter {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    items?: ToolParameter;
}

export interface ToolFunction {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        required?: string[];
        properties: {
            [key: string]: ToolParameter;
        };
    };
}

export interface Tool {
    type: 'function';
    function: ToolFunction;
}

export const tools: Tool[] = [
    {
        type: 'function',
        function: {
            name: 'query_relevant_memories_for_strings',
            description: 'query relevant memories for the given string queries',
            parameters: {
                type: 'object',
                required: ['queries'],
                properties: {
                    queries: { type: 'array', description: 'Array of RAG queries to get relevant memories for', items: { type: 'string' } },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'retrieve_short_term_memories',
            description: 'retrieve the last few summarized messages (both received and sent) from short term memory for context leading up the the new message(s)',
            parameters: {
                type: 'object',
                required: [],
                properties: {},
            },
        },
    },
]
