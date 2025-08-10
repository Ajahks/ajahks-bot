import {Ollama} from "ollama";
import {MemoryV2} from "./memoryV2";

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

    public async rateImportance(memory: MemoryV2): Promise<number> {
        const prompt = "Given the following memory, rate the importance of the memory from 0 to 10. 0 being not important and 10 being very important. Please response with just a number:\n"
            + `"${memory.description}"\n`

        const response = await this.ollama.chat({
            model: 'qwen3:32b',
            messages: [{role: 'user', content: prompt}],
        })
        return parseFloat(response.message.content)
    }
}