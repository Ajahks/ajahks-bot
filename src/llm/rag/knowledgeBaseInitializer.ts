import {LocalOllama} from "../localOllama";
import {OllamaEmbedder} from "./ollamaEmbedder";
import {OllamaSummarizer} from "./summarizer/ollamaSummarizer";
import {VectorDB} from "./vectorDb";
import {indexAllDotaKnowledge} from "./index/dotaKnowledgeIndexer";

const ollamaInstance = new LocalOllama();
const embedder = new OllamaEmbedder(ollamaInstance.instance);
const summarizer = new OllamaSummarizer(ollamaInstance.instance);
const vectorDb = new VectorDB("./data/vectordb.json");

console.log("Indexing Dota Knowledge...")

indexAllDotaKnowledge(embedder, summarizer, vectorDb).then(() => {
    vectorDb.saveDbToDisk();
})
