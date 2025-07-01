import {VectorDB} from "../vectorDb";
import {OllamaEmbedder} from "../ollamaEmbedder";
import {OllamaSummarizer} from "../summarizer/ollamaSummarizer";
import {aggregateAllHeroData} from "../../../dota/heroDataAggregator";
import {items} from "dotaconstants"

export async function indexAllDotaKnowledge(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    // await indexDotaAbilityJson(embedder, summarizer, vectorDb);
    await indexDotaHeroData(embedder, summarizer, vectorDb);
    await indexDotaItemData(embedder, summarizer, vectorDb)
}

export async function indexDotaHeroData(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    const chunkedHeroes: string[] = [];
    const aggregatedHeroData = aggregateAllHeroData()
    for (const data of aggregatedHeroData) {
        const dataChunk = `${JSON.stringify(data)}`;
        chunkedHeroes.push(await summarizer.summarizeChunk(
            dataChunk,
            "This is the JSON stringified data/stats for a Dota 2 hero including their abilities and stats."
        ));
    }
    const embeddings = (await embedder.embedChunks(chunkedHeroes)).embeddings;
    putChunkEmbeddingsToDb(chunkedHeroes, embeddings, vectorDb)
}

export async function indexDotaItemData(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    const chunkedItemsData: string[] = [];

    for (const [k, v] of Object.entries(items)) {
        const dataChunk = `${k}: ${JSON.stringify(v)}`
        chunkedItemsData.push(await summarizer.summarizeChunk(
            dataChunk,
            "This is the JSON stringified data/stats for a Dota 2 item including its abilities and stats they provide."
        ));
    }
    const embeddings = (await embedder.embedChunks(chunkedItemsData)).embeddings;
    putChunkEmbeddingsToDb(chunkedItemsData, embeddings, vectorDb)
}

function putChunkEmbeddingsToDb(chunks: string[], embeddings: number[][], vectorDb: VectorDB) {
    chunks.forEach((chunk, i) => {
        vectorDb.addVector({
            embedding: embeddings[i],
            chunk: chunk
        });
    })
}
