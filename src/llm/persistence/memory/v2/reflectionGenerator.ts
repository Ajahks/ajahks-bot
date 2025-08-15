import {MemoryType, MemoryV2, MemoryV2Data} from "./memoryV2";
import {Ollama} from "ollama";
import {splitReasoningResponse} from "../../../reasoningModelResponseUtils";
import {MemoryStream} from "./memoryStream";
import {OllamaEmbedder} from "../../../rag/ollamaEmbedder";
import {ImportanceRater} from "./importanceRater";
import fs from "fs";

export class ReflectionGenerator {
    // todo maybe save this in storage so we can recover the list when we start up again?
    memoriesToReflect: MemoryV2[] = []
    private memoryStream: MemoryStream;
    private ollamaInstance: Ollama;
    private embedder: OllamaEmbedder;
    private importanceRater: ImportanceRater;
    private diskFilePath: string = "./data/reflectionMemories.json";

    constructor(ollamaInstance: Ollama, memoryStream: MemoryStream, embedder: OllamaEmbedder, importanceRater: ImportanceRater) {
        this.ollamaInstance = ollamaInstance;
        this.memoryStream = memoryStream;
        this.embedder = embedder;
        this.importanceRater = importanceRater;
        this.readFromDisk();
    }

    pushMemory(memory: MemoryV2): number {
        this.memoriesToReflect.push(memory);
        this.saveMemoryQueueToDisk();
        return this.memoriesToReflect.length;
    }

    async reflectOnQueuedMemories(): Promise<MemoryV2[]> {
        const highLevelQuestions = await this.generateHighLevelQuestionsFromMemoryList(3);
        const newReflections = highLevelQuestions.map(async (question) => {
            const relevantMemories = await this.findRelevantMemoriesForQuestion(question);
            const filteredMemories = relevantMemories.filter(memory => memory.memoryType != MemoryType.SEED)
            return await this.generateReflectionsOnMemories(question, filteredMemories, 3)
        })

        return Promise.all(newReflections).then(reflectionMemories => reflectionMemories.flat()).finally(() =>{
            this.memoriesToReflect = []
            this.saveMemoryQueueToDisk();
        });
    }

    private async generateHighLevelQuestionsFromMemoryList(numQuestions: number): Promise<string[]> {
        const memoriesString = this.memoriesToReflect.map((memory) => {
            return `{` + memory.getMemoryDescription() + "}"
        }).join("\n");

        const chatMessage = `${memoriesString}
        
        Given only the information above, what are ${numQuestions} most salient high-level questions we can answer about the subjects in the statements? 
        Please only respond with the questions starting each question with =QUESTION=
        
        No whitespace or newlines before the first =QUESTION=.
        An example formatted response would be:
        =QUESTION= How does person A study dinosaurs? 
        =QUESTION= Why does person B dislike person A's studies? 
        `
        const chatResponse = await this.ollamaInstance.chat({
            model: 'qwen3:32b',
            messages: [{ role: 'user', content: chatMessage }],
        });

        const response = splitReasoningResponse(chatResponse.message.content).message
        console.log(`Generated questions for reflection:\n${response}`)
        return response.split("=QUESTION=").filter(s => s != undefined && s.length > 0)
            .map(question => question.replace("=QUESTION=", "").trim());
    }

    private async findRelevantMemoriesForQuestion(question: string): Promise<MemoryV2[]> {
        const questionEmbedding = (await this.embedder.embedChunk(question)).embedding;
        const tempMemory = MemoryV2.newMemory(MemoryType.REFLECTION, question, questionEmbedding, [], 0);
        return this.memoryStream.retrieveRelevantMemories(tempMemory, 22, new Date(), 20);
    }

    private async generateReflectionsOnMemories(topicQuestion: string, memories: MemoryV2[], numReflections: number): Promise<MemoryV2[]> {
        const memoriesString = memories.map((memory, index) => `${index}: ${memory.getMemoryDescription()}`).join("\n");
        const chatMessage = `Statements relating to question ${topicQuestion}:
            ${memoriesString} 
            
            What ${numReflections} high-level, standalone, insights can you infer from the above statements, that may answer the original question?
            Please format response like so:
            =REFLECTION= [your first reflection here] =REF= [list of indexes of referenced memories for the insight]
            
            No whitespace or newlines before the first =REFLECTION=. An example response would be:
            =REFLECTION= Person A really likes to study dinosaurs =REF= 1,2 
            =REFLECTION= Person B doesn't like person A's studies, but deals with it =REF= 0,3 
        `
        const chatResponse = await this.ollamaInstance.chat({
            model: 'qwen3:32b',
            messages: [{ role: 'user', content: chatMessage }],
        });
        const response = splitReasoningResponse(chatResponse.message.content).message
        console.log(`Generated reflections:\n${response}`)
        const reflectionMemories = response.split("=REFLECTION=").filter(s => s != undefined && s.length > 0)
            .map(async reflectionLine => {
                const splitReflectionLine = reflectionLine.trim().split("=REF=");
                try {
                    const reflection = splitReflectionLine[0].replace("=REFLECTION=", "").trim();
                    const referencedIndices = splitReflectionLine[1].trim();
                    const referencedMemoryIds = referencedIndices.split(",").map(Number).map(i => memories[i].id);
                    const reflectionEmbedding = (await this.embedder.embedChunk(reflection)).embedding;
                    const reflectionImportance = await this.importanceRater.rateImportance(reflection);
                    return MemoryV2.newMemory(
                        MemoryType.REFLECTION,
                        reflection,
                        reflectionEmbedding,
                        referencedMemoryIds,
                        reflectionImportance
                    )
                } catch(e) {
                    console.log(`Error parsing reflection line: ${reflectionLine}`, e)
                    return null;
                }
            })
        return await Promise.all(reflectionMemories).then(reflectionMemory => {
            return reflectionMemory.filter(r => r != null)
        })
    }

    saveMemoryQueueToDisk() {
        const jsonMemoryDb: MemoryV2Data[] = Array.from(this.memoriesToReflect).map((memory) => {
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
        console.log(`Attempting to read reflectedMemories from file: ${this.diskFilePath}`);
        try {
            const data = fs.readFileSync(this.diskFilePath, 'utf-8');
            const jsonMemoryDb = JSON.parse(data);
            this.memoriesToReflect = jsonMemoryDb.map((memoryData: MemoryV2Data) => {
                return MemoryV2.fromJson(memoryData)
            });
        } catch (error) {
            console.log(`Failed to read file and populate db, please run \`npm run init-db\` or the db is not initialized yet: ${error}`)
        }
    }
}