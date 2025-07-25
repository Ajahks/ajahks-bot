import * as fs from "fs";

export interface VectorData {
    chunk: string,
    embedding: number[],
}

interface SimilarityData {
    vector: VectorData,
    similarity: number,
}

export class VectorDB {
    private readonly diskFilePath: string;
    inMemoryVectors: Map<number[], VectorData> = new Map();

    constructor(diskFilePath: string) {
        this.diskFilePath = diskFilePath
    }

    addVector(vector: VectorData) {
        this.inMemoryVectors.set(vector.embedding, vector)
    }

    removeEmbedding(embedding: number[]) {
        this.inMemoryVectors.delete(embedding);
    }

    resetVectorDb() {
        this.inMemoryVectors = new Map();
    }

    saveDbToDisk() {
        console.log(`writing DB to file: ${this.diskFilePath}`);
        const vectors: VectorData[] = Array.from(this.inMemoryVectors.values());
        const json = JSON.stringify(vectors, null, 2);
        fs.writeFileSync(this.diskFilePath, json, 'utf-8')
    }

    readDbFromDisk() {
        console.log(`Reading DB from file: ${this.diskFilePath}`);
        try {
            const data = fs.readFileSync(this.diskFilePath, 'utf-8');
            const vectors: VectorData[] = JSON.parse(data);
            vectors.forEach((vector: VectorData) => {
                this.addVector(vector);
            })
        } catch (error) {
            console.log(`Failed to read file and populate db, please run \`npm run init-db\` or the db is not initialized yet: ${error}`)
        }
    }

    retrieveSimilarVectors(inputVector: VectorData, topN: number, minSimilarityValue?: number): VectorData[] {
        const embeddings = Array.from(this.inMemoryVectors.keys());
        const similaritiesList: SimilarityData[] = embeddings.map((embedding: number[]) => {
            const similarity = this.cosineSimilarity(inputVector.embedding, embedding);
            return {
                vector: this.inMemoryVectors.get(embedding)!,
                similarity: similarity
            }
        });

        // sort in descending order
        const sortedSimilarityList = similaritiesList.sort((a, b) => b.similarity - a.similarity);
        const topNSortedSimilarityList = sortedSimilarityList.slice(0, topN).map((similarityData) => {
            return similarityData
        })

        if (minSimilarityValue == undefined) {
            return topNSortedSimilarityList.map((similarityData) => {
                console.log(`\nSimilarity Value: ${similarityData.similarity} for ${similarityData.vector.chunk}`)
                return similarityData.vector
            });
        }
        // find the min index where the similarity values start getting too large
        let minIndex = topNSortedSimilarityList.length;
        for (let currIndex = 0; currIndex < topNSortedSimilarityList.length; currIndex++) {
            if (topNSortedSimilarityList[currIndex].similarity < minSimilarityValue) {
                minIndex = currIndex;
                break;
            }
        }
        // filter out the values under the min similarity value
        return topNSortedSimilarityList.slice(0, minIndex).map((similarityData) => {
            console.log(`\nSimilarity Value: ${similarityData.similarity} for ${similarityData.vector.chunk}`)
            return similarityData.vector
        });
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