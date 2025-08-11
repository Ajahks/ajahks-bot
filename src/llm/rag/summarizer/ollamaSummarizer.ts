import {Ollama} from "ollama";
import {splitReasoningResponse} from "../../reasoningModelResponseUtils";

export class OllamaSummarizer {
    private ollamaInstance: Ollama;

    constructor(ollamaInstance: Ollama) {
        this.ollamaInstance = ollamaInstance
    }

    async summarizeChunk(chunk: string, backgroundContext: string): Promise<string>  {
        const prompt = `
            === Background Context ===
            ${backgroundContext} 
            === End Background Context ===
            
            === Chunk To Summarize ===
            ${chunk}
            === End Chunk To Summarize ===
            Please summarize the chunk above to be used for RAG indexing
            `
        const response = await this.ollamaInstance.chat({
            model: 'granite3.2:2b',
            messages: [{role: 'user', content: prompt}],
        })

        const reasoningResponse = splitReasoningResponse(response.message.content)
        // console.log(`Summarized stats: ${reasoningResponse.message}`)
        return reasoningResponse.message
    }

    async summarizeMessage(message: string): Promise<string> {
        const prompt = `
            The following is a message from a discord user. Please summarize the contents of the message and be sure to pick out any key information that should be remembered. 
            No need to include any special formatting, just a plain text summary is fine.
            Message: ["${message}"]
            `
        const response = await this.ollamaInstance.chat({
            model: 'qwen3:14b',
            messages: [{role: 'user', content: prompt}],
        })
        const reasoningResponse = splitReasoningResponse(response.message.content)
        // console.log(`Summarized stats: ${reasoningResponse.message}`)
        return reasoningResponse.message
    }
}