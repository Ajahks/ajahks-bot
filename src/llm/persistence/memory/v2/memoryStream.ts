import {MemoryV2, MemoryV2Data} from "./memoryV2";
import fs from "fs";

export class MemoryStream {
    private readonly diskFilePath: string;
    memoryDb: MemoryV2[] = [];

    constructor(diskFilePath: string) {
        this.diskFilePath = diskFilePath;
        this.readFromDisk()
    }

    saveToDisk() {
        console.log(`Writing MemoryStream to file: ${this.diskFilePath}`);
        const jsonMemoryDb: MemoryV2Data[] = this.memoryDb.map((memory) => {
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
            this.memoryDb = jsonMemoryDb.map((memoryData: MemoryV2Data) => {
                return MemoryV2.fromJson(memoryData)
            })
        } catch (error) {
            console.log(`Failed to read file and populate db, please run \`npm run init-db\` or the db is not initialized yet: ${error}`)
        }
    }

    addMemory(memory: MemoryV2) {
        this.memoryDb.push(memory)
    }
}
