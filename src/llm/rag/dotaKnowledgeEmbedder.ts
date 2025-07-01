import {VectorDB} from "./vectorDb";
import {OllamaEmbedder} from "./ollamaEmbedder";
import {heroes, abilities} from "dotaconstants/index";

export async function embedDotaKnowledge(embedder: OllamaEmbedder, vectorDb: VectorDB) {
    await embedAbilityKnowledge(embedder, vectorDb)
    await embedHeroKnowledge(embedder, vectorDb)
}

async function embedAbilityKnowledge(embedder: OllamaEmbedder, vectorDb: VectorDB) {
    for (const [k, v] of Object.entries(abilities)) {
        const abilityChunk = `${k}: ${JSON.stringify(v)}`
        const embeddingResponse = await embedder.embedChunk(abilityChunk)
        vectorDb.addVector({
            embedding: embeddingResponse.embedding,
            chunk: abilityChunk,
        })
        console.log(`Embedded chunk! ${abilityChunk}`)
    }
}

async function embedHeroKnowledge(embedder: OllamaEmbedder, vectorDb: VectorDB) {
    for (const v of Object.values(heroes)) {
        const heroChunk = `${v.name}: ${JSON.stringify(v)}`
        const embeddingResponse = await embedder.embedChunk(heroChunk)
        vectorDb.addVector({
            embedding: embeddingResponse.embedding,
            chunk: heroChunk,
        })
        console.log(`Embedded chunk! ${heroChunk}`)
    }
}
