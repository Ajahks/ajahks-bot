import {MemoryV2} from "./memoryV2";

test('generate id creates unique ids', () => {
    const memory1 = new MemoryV2();
    const memory2 = new MemoryV2();

    expect(memory1.id).not.toEqual(memory2.id);
});

test('set lastAccessedTimestamp sets the timestamp to passed in timestamp', () => {
    const memory = new MemoryV2();
    const timestamp = new Date();

    expect(memory.setLastAccessedTimestamp(timestamp)).toEqual(timestamp);
});

test('set lastAccessedTimestamp with default values still sets timestamp', () => {
    const memory = new MemoryV2();

    expect(memory.setLastAccessedTimestamp()).not.toBeNull();
});

test('construct memory with a referenced memory id should have referenced memory', () => {
    const referencedMemory = new MemoryV2();
    const memory = new MemoryV2(
        undefined,
        [referencedMemory.id]
    );

    expect(memory.referencedMemoryIds).toContain(referencedMemory.id);
});

test('construct memory with a description should have description', () => {
    const testDescription = "test description";
    const memory = new MemoryV2(testDescription);

    expect(memory.description).toContain(testDescription);
});

test('setDescription is called verify that description is set', () => {

    const testDescription = "test description";
    const memory = new MemoryV2();
    memory.setDescription(testDescription);

    expect(memory.description).toContain(testDescription);
})
