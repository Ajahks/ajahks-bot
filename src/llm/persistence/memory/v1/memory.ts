import {OllamaSummarizer} from "../../../rag/summarizer/ollamaSummarizer";
import {ChatInteractionFragment, ChatInteractionFragmentData} from "./chatInteractionFragment";

export interface EmbeddedMemory {
    memory: Memory,
    embedding: number[],
    similarityValue?: number,
}

export class Memory {
    fragments: ChatInteractionFragment[] = [];
    summary: string = "No summary provided";
    private lastTimeStamp: string;
    private readonly startTimeStamp: string;

    constructor(initialFragments: ChatInteractionFragment[]) {
        this.fragments.push(...initialFragments);
        this.lastTimeStamp = initialFragments[initialFragments.length - 1].timestamp;
        this.startTimeStamp = initialFragments[0].timestamp;
    }

    addFragment(fragment: ChatInteractionFragment) {
        this.fragments.push(fragment);
        this.lastTimeStamp = fragment.timestamp;
    }

    setSummary(summary: string) {
        this.summary = summary;
    }

    async summarizeMemory(summarizer: OllamaSummarizer) {
        const allFragmentString: string = this.fragments.map(fragment => {
            return fragment.toString()
        }).join('\n');

        // TODO: If we want to support other fragments that isn't chat logs, we would need to abstract this background context out
        return summarizer.summarizeChunk(allFragmentString, "this is a snippet of a chat log. please summarize the conversation of this chat log.")
    }

    toString(): string {
        const allFragmentString: string = this.fragments.map(fragment => {
            return fragment.toString()
        }).join('\n');

        return '= Memory Start =\n' +
            `* Start time of memory: ${this.lastTimeStamp}\n` +
            `* Most recent time of memory: ${this.lastTimeStamp}\n` +
            `* Summary Of Memory: ${this.summary}\n` +
            `* Actual Chat Log: [\n` +
            allFragmentString + `]\n` +
            `= Memory End =\n`;
    }

    toSummarizedString(): string {
        return '= Memory Start =\n' +
            `* Start time of memory: ${this.lastTimeStamp}\n` +
            `* Summary Of Memory: ${this.summary}\n` +
            `= Memory End =\n`;
    }

    static fromJSON(json: string) {
        const parsedObject = JSON.parse(json);
        const parsedFragments: ChatInteractionFragment[] = parsedObject.fragments.map((fragment: ChatInteractionFragmentData) => {
            return ChatInteractionFragment.fromObject(fragment)
        })
        const parsedMemory = new Memory(parsedFragments);
        parsedMemory.setSummary(parsedObject.summary);
        return parsedMemory
    }

    static toJSON(memory: Memory) {
        return JSON.stringify(memory)
    }
}