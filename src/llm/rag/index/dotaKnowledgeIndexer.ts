import {VectorDB} from "../vectorDb";
import {OllamaEmbedder} from "../ollamaEmbedder";
import {OllamaSummarizer} from "../summarizer/ollamaSummarizer";
import {aggregateAllHeroData} from "../../../dota/heroDataAggregator";
import {items} from "dotaconstants"
import patchDetails from "dotaconstants/build/patchnotes.json";
import {Spinner} from 'cli-spinner';

export async function indexAllDotaKnowledge(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    await indexDotaHeroData(embedder, summarizer, vectorDb);
    await indexDotaItemData(embedder, summarizer, vectorDb)
    await indexLatestDotaPatches(embedder, summarizer, vectorDb);
}

export async function indexDotaHeroData(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    const spinner = new Spinner("Indexing Dota Hero Data...");
    spinner.start();
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
    spinner.stop()
}

export async function indexDotaItemData(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    const spinner = new Spinner("Indexing Dota Item Data...");
    spinner.start();
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
    spinner.stop()
}

export async function indexLatestDotaPatches(embedder: OllamaEmbedder, summarizer: OllamaSummarizer, vectorDb: VectorDB) {
    const spinner = new Spinner("Indexing top Dota Patch Notes...");
    spinner.start();
    const chunkedPatchNotes: string[] = [];
    const patchList = Object.keys(patchDetails).sort((a, b) => a < b ? 1 : -1 )
    const top3Patches = patchList.slice(0, 3)

    for (let i = 0; i < top3Patches.length; i++) {
        const patchName = i == 0 ? top3Patches[i] + " (latest patch)" : top3Patches[i];
        const dataChunk = `${patchName}: ${JSON.stringify(patchDetails[top3Patches[i] as keyof typeof patchDetails])}`

        chunkedPatchNotes.push(await summarizer.summarizeChunk(
            dataChunk,
            "This is the JSON stringified patch notes for a Dota 2 including its item and ability changes. " +
            "to summarize, reformat this to markdown without changing the underlying data."
        ));
    }

    const embeddings = (await embedder.embedChunks(chunkedPatchNotes)).embeddings;
    putChunkEmbeddingsToDb(chunkedPatchNotes, embeddings, vectorDb)
    spinner.stop();
}

function putChunkEmbeddingsToDb(chunks: string[], embeddings: number[][], vectorDb: VectorDB) {
    chunks.forEach((chunk, i) => {
        vectorDb.addVector({
            embedding: embeddings[i],
            chunk: chunk
        });
    })
}
