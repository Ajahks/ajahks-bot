
export class MemoryV2 {
    id: string;
    createTimestamp: Date;
    lastAccessedTimestamp?: Date;
    description?: string;
    referencedMemoryIds: string[];

    constructor(
        description?: string,
        referencedMemoryIds?: string[]
    ) {
        this.id = this.generateId();
        this.createTimestamp = new Date();
        this.description = description;
        this.referencedMemoryIds = referencedMemoryIds ?? [];
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

    private generateId(): string {
        return Date.now().toString() + Math.random().toString(36).substring(2);
    }
}