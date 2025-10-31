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

const ollamaInstance = new LocalOllama();
const embedder = new OllamaEmbedder(ollamaInstance.instance);
const memoryStream = new MemoryStream(filePath);

// delete old seed memories
const seedMemories = memoryStream.getAllMemories(MemoryType.SEED)
seedMemories.forEach((seedMemory) => {
    memoryStream.removeMemory(seedMemory.id)
})

// Uncomment if need to purge bot memories
// const botMemories = memoryStream.getAllMemories(MemoryType.BOT_MESSAGE)
// botMemories.forEach((botMemory) => {
//     memoryStream.removeMemory(botMemory.id)
// })

SEED_MEMORIES.forEach( async (seedMemory) => {
    await embedder.embedChunk(seedMemory).then(response => {
        const embedding = response.embedding
        const memoryImportance = 20;
        const memory = MemoryV2.newMemory(MemoryType.SEED, seedMemory, embedding, [], memoryImportance);

        console.log(`Seeding memory: ${seedMemory}`)
        memoryStream.addMemory(memory);
        memoryStream.saveToDisk();
    });
});
