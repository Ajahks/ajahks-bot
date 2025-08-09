export enum MemoryType {
    OBSERVATION,
    REFLECTION,
}

// JSON friendly representation of the memory that can be deserialized into a MemoryV2 object
export interface MemoryV2Data {
    id: string;
    createTimestamp: number;
    lastAccessedTimestamp: number;
    description?: string;
    referencedMemoryIds: string[];
    memoryType: MemoryType;
}

export class MemoryV2 {
    readonly id: string;
    readonly createTimestamp: Date;
    lastAccessedTimestamp: Date;
    description?: string;
    referencedMemoryIds: string[];
    readonly memoryType: MemoryType;

    constructor(
        memoryType: MemoryType,
        id?: string,
        createTimestampISOString?: number,
        lastAccessedTimestampISOString?: number,
        description?: string,
        referencedMemoryIds?: string[],
    ) {
        this.id = id ?? this.generateId();
        this.createTimestamp = createTimestampISOString ? new Date(createTimestampISOString) : new Date();
        this.lastAccessedTimestamp = lastAccessedTimestampISOString ? new Date(lastAccessedTimestampISOString) : this.createTimestamp;
        this.description = description;
        this.referencedMemoryIds = referencedMemoryIds ?? [];
        this.memoryType = memoryType;
    }

    /**
     * Override if any other processing needs to be done to the description
     * Key part of a memory will contain a, usually, summarized description that describes what this memory is remembering
     */
    getMemoryDescription() {
        return this.description;
    }

    setLastAccessedTimestamp(date?: Date): Date {
        if (date === undefined) {
            this.lastAccessedTimestamp = new Date();
        } else {
            this.lastAccessedTimestamp = date;
        }

        return this.lastAccessedTimestamp;
    }

    setDescription(description: string) {
        this.description = description;
    }

    toJson(): MemoryV2Data {
        return {
            id: this.id,
            createTimestamp: this.createTimestamp.getTime(),
            lastAccessedTimestamp: this.lastAccessedTimestamp.getTime(),
            description: this.description,
            referencedMemoryIds: this.referencedMemoryIds,
            memoryType: this.memoryType,
        }
    }

    static fromJson(json: MemoryV2Data) {
        return new MemoryV2(
            json.memoryType,
            json.id,
            json.createTimestamp,
            json.lastAccessedTimestamp,
            json.description,
            json.referencedMemoryIds
        )
    }

    static newMemory(
        memoryType: MemoryType,
        description?: string,
        referencedMemoryIds?: string[],
    ) {
        return new MemoryV2(
            memoryType,
            undefined,
            undefined,
            undefined,
            description,
            referencedMemoryIds,
        )
    }

    private generateId(): string {
        return Date.now().toString() + Math.random().toString(36).substring(2);
    }
}