import {Ollama} from "ollama";

const MODEL = 'mxbai-embed-large:latest';

export class OllamaEmbedder {

    private ollamaInstance: Ollama;

    constructor(ollamaInstance: Ollama) {
        this.ollamaInstance = ollamaInstance
    }

    embedChunk(chunk: string) {
        return this.ollamaInstance.embeddings({
            model: MODEL,
            prompt: chunk,
        })
    }

    embedChunks(chunks: string[]) {
        return this.ollamaInstance.embed({
            model: MODEL,
            input: chunks,
        })
    }
}