import {VectorDB} from "../vectorDb";
import {OllamaEmbedder} from "../ollamaEmbedder";
import { abilities, heroes } from "dotaconstants";

export async function indexAllDotaKnowledge(embedder: OllamaEmbedder, vectorDb: VectorDB) {
    await indexDotaAbilityJson(embedder, vectorDb);
    await indexDotaHeroesJson(embedder, vectorDb);
}

export async function indexDotaAbilityJson(embedder: OllamaEmbedder, vectorDb: VectorDB) {
    const chunkedAbilities = Object.entries(abilities).map(([k, v]) => {
        return `${k}: ${JSON.stringify(v)}`
    });
    const embeddings = (await embedder.embedChunks(chunkedAbilities)).embeddings;
    putChunkEmbeddingsToDb(chunkedAbilities, embeddings, vectorDb)
}

export async function indexDotaHeroesJson(embedder: OllamaEmbedder, vectorDb: VectorDB) {
    const chunkedHeroes = Object.values(heroes).map((v) => {
        return `${v.name}: ${JSON.stringify(v)}`
    })
    const embeddings = (await embedder.embedChunks(chunkedHeroes)).embeddings;
    putChunkEmbeddingsToDb(chunkedHeroes, embeddings, vectorDb)
}

function putChunkEmbeddingsToDb(chunks: string[], embeddings: number[][], vectorDb: VectorDB) {
    chunks.forEach((chunk, i) => {
        vectorDb.addVector({
            embedding: embeddings[i],
            chunk: chunk
        });
    })
}
