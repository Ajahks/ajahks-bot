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
        console.log(`Summarized stats: ${reasoningResponse.message}`)
        return reasoningResponse.message
    }
}