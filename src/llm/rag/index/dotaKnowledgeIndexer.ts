import {VectorDB} from "../vectorDb";
import {OllamaEmbedder} from "../ollamaEmbedder";
import {OllamaSummarizer} from "../summarizer/ollamaSummarizer";
import {aggregateAllHeroData} from "../../../dota/heroDataAggregator";

export async function indexAllDotaKnowledge(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    // await indexDotaAbilityJson(embedder, summarizer, vectorDb);
    await indexDotaHeroData(embedder, summarizer, vectorDb);
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

function putChunkEmbeddingsToDb(chunks: string[], embeddings: number[][], vectorDb: VectorDB) {
    chunks.forEach((chunk, i) => {
        vectorDb.addVector({
            embedding: embeddings[i],
            chunk: chunk
        });
    })
}
