export enum MemoryType {
    OBSERVATION,
    REFLECTION,
    SEED,
}

export function getMemoryTypeName(memoryType: MemoryType): string {
    switch (memoryType) {
        case MemoryType.OBSERVATION:
            return "OBSERVATION";
        case MemoryType.REFLECTION:
            return "REFLECTION";
        case MemoryType.SEED:
            return "SEED MEMORY";
        default:
            return "UNKNOWN";
    }
}

// JSON friendly representation of the memory that can be deserialized into a MemoryV2 object
export interface MemoryV2Data {
    id: string;
    createTimestamp: number;
    lastAccessedTimestamp: number;
    description: string;
    embedding: number[];
    referencedMemoryIds: string[];
    memoryType: MemoryType;
    importance: number;
}

export class MemoryV2 {
    readonly id: string;
    readonly memoryType: MemoryType;
    readonly createTimestamp: Date;
    readonly description: string;
    lastAccessedTimestamp: Date;
    referencedMemoryIds: string[];
    importance: number = 0;
    embedding: number[];

    constructor(
        memoryType: MemoryType,
        description: string,
        embedding: number[] = [],
        id?: string,
        createTimestampISOString?: number,
        lastAccessedTimestampISOString?: number,
        referencedMemoryIds?: string[],
        importance?: number,
    ) {
        this.id = id ?? this.generateId();
        this.embedding = embedding;
        this.createTimestamp = createTimestampISOString ? new Date(createTimestampISOString) : new Date();
        this.lastAccessedTimestamp = lastAccessedTimestampISOString ? new Date(lastAccessedTimestampISOString) : this.createTimestamp;
        this.description = description;
        this.referencedMemoryIds = referencedMemoryIds ?? [];
        this.memoryType = memoryType;
        this.importance = importance ?? 0;
    }

    /**
     * Override if any other processing needs to be done to the description
     * Key part of a memory will contain a, usually, summarized description that describes what this memory is remembering
     */
    getMemoryDescription() {
        return this.description;
    }

    getMemoryDescriptionWithFormattedDate() {
        const formattedDate = this.createTimestamp.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"});
        return `{${formattedDate}} => {${this.getMemoryDescription()}}`;
    }

    setLastAccessedTimestamp(date?: Date): Date {
        if (date === undefined) {
            this.lastAccessedTimestamp = new Date();
        } else {
            this.lastAccessedTimestamp = date;
        }

        return this.lastAccessedTimestamp;
    }

    toJson(): MemoryV2Data {
        return {
            id: this.id,
            createTimestamp: this.createTimestamp.getTime(),
            lastAccessedTimestamp: this.lastAccessedTimestamp.getTime(),
            description: this.description,
            referencedMemoryIds: this.referencedMemoryIds,
            memoryType: this.memoryType,
            importance: this.importance,
            embedding: this.embedding,
        }
    }

    static fromJson(json: MemoryV2Data) {
        return new MemoryV2(
            json.memoryType,
            json.description,
            json.embedding,
            json.id,
            json.createTimestamp,
            json.lastAccessedTimestamp,
            json.referencedMemoryIds,
            json.importance
        )
    }

    static newMemory(
        memoryType: MemoryType,
        description: string,
        embedding: number[],
        referencedMemoryIds?: string[],
        importance?: number,
    ) {
        return new MemoryV2(
            memoryType,
            description,
            embedding,
            undefined,
            undefined,
            undefined,
            referencedMemoryIds,
            importance,
        )
    }

    private generateId(): string {
        return Date.now().toString() + Math.random().toString(36).substring(2);
    }
}