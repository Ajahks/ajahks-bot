import {MemoryType, MemoryV2, MemoryV2Data} from "./memoryV2";
import fs from "fs";

const RECENCY_WEIGHT = 1.0;
const IMPORTANCE_WEIGHT = 1.0;
const RELEVANCE_WEIGHT = 1.0;
const RECENCY_DECAY_FACTOR = 0.990; // How quickly the score decays as time difference goes on. Lower number means faster decay.
const RECENCY_PERIOD = 1000 * 60 * 60; // Period of 1 hour.  Higher period means less score decay for older memories.
const MAX_CATEGORY_SCORE = 10;

interface MemoryScores {
    recencyScore: number,
    importanceScore: number,
    relevanceScore: number,
    totalScore: number,
}

export class MemoryStream {
    private readonly diskFilePath: string;
    memoryDb: Map<string, MemoryV2> = new Map();

    constructor(diskFilePath: string) {
        this.diskFilePath = diskFilePath;
        this.readFromDisk()
    }

    saveToDisk() {
        console.log(`Writing MemoryStream to file: ${this.diskFilePath}`);
        const jsonMemoryDb: MemoryV2Data[] = Array.from(this.memoryDb.values()).map((memory) => {
            return memory.toJson()
        })
        const json = JSON.stringify(jsonMemoryDb, null, 2);
        try {
            fs.writeFileSync(this.diskFilePath, json, 'utf-8')
        } catch (error) {
            console.log(`Failed to write file: ${error}`)
        }
    }

    readFromDisk() {
        console.log(`Attempting to read MemoryStream from file: ${this.diskFilePath}`);
        try {
            const data = fs.readFileSync(this.diskFilePath, 'utf-8');
            const jsonMemoryDb = JSON.parse(data);
            this.memoryDb = new Map<string, MemoryV2>(
                jsonMemoryDb.map((memoryData: MemoryV2Data) => {
                    const memory = MemoryV2.fromJson(memoryData)
                    return [memory.id, memory]
                })
            )
        } catch (error) {
            console.log(`Failed to read file and populate db, please run \`npm run init-db\` or the db is not initialized yet: ${error}`)
        }
    }

    addMemory(memory: MemoryV2) {
        this.memoryDb.set(memory.id, memory)
    }

    retrieveRelevantMemories(queriedMemory: MemoryV2, minScore: number, fetchTime: Date, maxNumResults?: number): MemoryV2[] {
        const scoredMemories = Array.from(this.memoryDb.values()).map((memory) => {
            return {
                memory: memory,
                score: this.calculateScoreForMemory(memory, queriedMemory, fetchTime)
            }
        })

        const sortedScoredMemories = scoredMemories.sort((a, b) => b.score.totalScore - a.score.totalScore);
        const filteredMemories = sortedScoredMemories
            .filter((scoredMemory) => {return scoredMemory.score.totalScore >= minScore})
            .map((scoredMemory) => {return scoredMemory.memory})
        if (maxNumResults !== undefined) {
            return filteredMemories.slice(0, maxNumResults).map(mem => {
                mem.lastAccessedTimestamp = fetchTime;
                return mem
            })
        }
        return filteredMemories.map(mem => {
            mem.lastAccessedTimestamp = fetchTime;
            return mem
        })
    }

    getAllMemories(memoryType?: MemoryType): MemoryV2[] {
        const memories = Array.from(this.memoryDb.values())
        if (memoryType !== undefined) {
            return memories.filter((memory) => {
                return memory.memoryType == memoryType
            })
        }
        return memories
    }

    removeMemory(memoryId: string) {
        this.memoryDb.delete(memoryId)
    }

    private calculateScoreForMemory(memory: MemoryV2, queriedMemory: MemoryV2, fetchTime: Date): MemoryScores {
        const recencyScore = RECENCY_WEIGHT * this.calculateRecencyScore(memory, fetchTime);
        const importanceScore = IMPORTANCE_WEIGHT * this.calculateImportanceScore(memory);
        const relevanceScore = RELEVANCE_WEIGHT * this.calculateRelevanceScore(queriedMemory.embedding, memory);
        return {
            recencyScore: recencyScore,
            importanceScore: importanceScore,
            relevanceScore: relevanceScore,
            totalScore: recencyScore + importanceScore + relevanceScore,
        }
    }

    // Returns a recency score between 0 and MAX_CATEGORY_SCORE.  Exponentially decreases over time.
    private calculateRecencyScore(memory: MemoryV2, fetchTime: Date): number {
        const deltaMillis = Math.max(0, fetchTime.getTime() - memory.lastAccessedTimestamp.getTime());
        return MAX_CATEGORY_SCORE * Math.pow(RECENCY_DECAY_FACTOR, deltaMillis/RECENCY_PERIOD);
    }

    private calculateImportanceScore(memory: MemoryV2): number {
        return memory.importance;
    }

    private calculateRelevanceScore(topicEmbedding: number[], memory: MemoryV2): number {
        const memoryV2Embedding: number[] = memory.embedding;
        const similarity = this.cosineSimilarity(topicEmbedding, memoryV2Embedding);
        // Map from [-1, 1] to [0, 1]
        const normalizedSimilarity = (similarity + 1) / 2;
        return MAX_CATEGORY_SCORE * normalizedSimilarity;
    }

    private cosineSimilarity(embedding1: number[], embedding2: number[]): number {
        const dotProduct = embedding1.map((_, i) => {
            return embedding1[i] * embedding2[i];
        }).reduce((m, n) => m + n);
        const normEmbedding1 = Math.sqrt(embedding1.map((x) => x * x).reduce((m, n) => m + n));
        const normEmbedding2 = Math.sqrt(embedding2.map((x) => x * x).reduce((m, n) => m + n));

        return dotProduct / (normEmbedding1 * normEmbedding2)
    }
}
