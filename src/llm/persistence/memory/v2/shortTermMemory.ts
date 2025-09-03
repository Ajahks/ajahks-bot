import {getMemoryTypeName, MemoryV2, MemoryV2Data} from "./memoryV2";
import fs from "fs";

export class ShortTermMemory {

    private diskFilePath: string;
    private memory: MemoryV2[] = [];
    readonly size: number = 0;

    constructor(size: number, diskFilePath: string = "./data/shortTermMemory.json") {
        this.size = size;
        this.diskFilePath = diskFilePath;
        this.readFromDisk();
    }

    /*
     * Push a new memory into the short-term memory.  This pops out the oldest memory if the short-term memory is full.
     */
    pushWithinBounds(newMemory: MemoryV2): MemoryV2 | undefined {
        this.memory.push(newMemory);
        if (this.memory.length > this.size) {
            const evictedMemory = this.memory.shift();
            this.saveMemoryToDisk();
            return evictedMemory;
        }
        this.saveMemoryToDisk();
        return undefined;
    }

    getShortTermMemoriesFormatedString(): string {
        return this.memory.map((memory) => {
            return `    - (${getMemoryTypeName(memory.memoryType)}) ${memory.getMemoryDescriptionWithFormattedDate()}`
        }).join("\n");
    }

    saveMemoryToDisk() {
        const jsonMemoryDb: MemoryV2Data[] = this.memory.map((memory) => {
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
        console.log(`Attempting to read short-term memory from file: ${this.diskFilePath}`);
        try {
            const data = fs.readFileSync(this.diskFilePath, 'utf-8');
            const jsonMemoryDb = JSON.parse(data);
            this.memory = jsonMemoryDb.map((memoryData: MemoryV2Data) => {
                return MemoryV2.fromJson(memoryData)
            });
        } catch (error) {
            console.log(`Failed to read file and populate short-term memory.  Could be that short-term memory has not been created yet: ${error}`)
        }
    }
}