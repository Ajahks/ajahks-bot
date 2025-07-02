export interface VectorData {
    chunk: string,
    embedding: number[],
}

interface SimilarityData {
    vector: VectorData,
    similarity: number,
}

export class VectorDB {
    inMemoryVectors: VectorData[] = [];

    addVector(vector: VectorData) {
        this.inMemoryVectors.push(vector);
    }

    resetVectorDb() {
        this.inMemoryVectors = [];
    }

    retrieveSimilarVectors(inputVector: VectorData, topN: number): VectorData[] {
        const similaritiesList: SimilarityData[] = this.inMemoryVectors.map((knowledgeVector) => {
            const similarity = this.cosineSimilarity(inputVector, knowledgeVector);
            return {
                vector: knowledgeVector,
                similarity: similarity
            }
        });

        // sort in descending order
        const sortedSimilarityList = similaritiesList.sort((a, b) => b.similarity - a.similarity);
        return sortedSimilarityList.slice(0, topN).map((similarityData) => {
            console.log(`Similarity Value: ${similarityData.similarity} for ${similarityData.vector.chunk}`)
            return similarityData.vector
        })
    }

    private cosineSimilarity(vector1: VectorData, vector2: VectorData): number {
        const embedding1 = vector1.embedding;
        const embedding2 = vector2.embedding;

        const dotProduct = embedding1.map((_, i) => {
            return embedding1[i] * embedding2[i];
        }).reduce((m, n) => m + n);
        const normEmbedding1 = Math.sqrt(embedding1.map((x) => x * x).reduce((m, n) => m + n));
        const normEmbedding2 = Math.sqrt(embedding2.map((x) => x * x).reduce((m, n) => m + n));

        return dotProduct / (normEmbedding1 * normEmbedding2)
    }
}