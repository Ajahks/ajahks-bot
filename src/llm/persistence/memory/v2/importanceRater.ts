import {Ollama} from "ollama";
import {splitReasoningResponse} from "../../../reasoningModelResponseUtils";

export class ImportanceRater {
    static #instance: ImportanceRater;
    private readonly ollama: Ollama

    public static init(ollama: Ollama): ImportanceRater {
        if (!ImportanceRater.#instance) {
            ImportanceRater.#instance = new ImportanceRater(ollama);
        }
        return ImportanceRater.#instance;
    }

    public static get instance(): ImportanceRater {
        if (!ImportanceRater.#instance) {
            throw new Error("ImportanceRater not initialized. Call ImportanceRater.init(ollama) first.");
        }
        return ImportanceRater.#instance;
    }

    private constructor(ollama: Ollama) {
        this.ollama = ollama;
    }

    public async rateImportance(memoryDescription: string): Promise<number> {
        const prompt = "On a scale of 1 to 10, where 1 is purely mundane (e.g AJ went to bed, Alyssa pet her cat) and 10 is extremely poignant (e.g. a break up, a career change) that you absolutely must remember, rate the likely poignancy of the following piece of memory (Please just provide a 0-10 integer as your response):\n"
            + `["${memoryDescription}"]\n`

        const response = await this.ollama.chat({
            model: 'qwen3:8b',
            messages: [{role: 'user', content: prompt}],
        })
        const parsedResponse = splitReasoningResponse(response.message.content).message;
        const responseNumber = parseInt(parsedResponse)
        if (responseNumber >= 0 && responseNumber <= 10) {
            return responseNumber
        } else {
            console.log(`Invalid importance rating returned: ${responseNumber}.  Defaulting to 0.`)
            return 0;
        }
    }
}