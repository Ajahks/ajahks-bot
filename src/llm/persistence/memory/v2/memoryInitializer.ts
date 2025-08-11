import {MemoryStream} from "./memoryStream";
import fs from "fs";
import path from "path";
import {SEED_MEMORIES} from "../../../../context/background";
import {LocalOllama} from "../../../localOllama";
import {OllamaEmbedder} from "../../../rag/ollamaEmbedder";
import {MemoryType, MemoryV2} from "./memoryV2";
const filePath = "./data/memoryV2Stream.json";

// Ensure parent directory exists
fs.mkdirSync(path.dirname(filePath), { recursive: true });

if (!fs.existsSync(filePath)) {
    const memoryStream = new MemoryStream(filePath);
    const ollamaInstance = new LocalOllama();
    const embedder = new OllamaEmbedder(ollamaInstance.instance);

    SEED_MEMORIES.forEach( async (seedMemory) => {
        await embedder.embedChunk(seedMemory).then(response => {
            const embedding = response.embedding
            const memoryImportance = 10;
            const memory = MemoryV2.newMemory(MemoryType.OBSERVATION, seedMemory, embedding, [], memoryImportance);

            console.log(`Seeding memory: ${seedMemory}`)
            memoryStream.addMemory(memory);
            memoryStream.saveToDisk();
        });
    })

}

