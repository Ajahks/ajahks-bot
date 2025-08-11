import {MemoryType, MemoryV2} from "./memoryV2";

test('generate id creates unique ids', () => {
    const memory1 = MemoryV2.newMemory(MemoryType.OBSERVATION, "", []);
    const memory2 = MemoryV2.newMemory(MemoryType.OBSERVATION, "", []);

    expect(memory1.id).not.toEqual(memory2.id);
});

test('set lastAccessedTimestamp sets the timestamp to passed in timestamp', () => {
    const memory = MemoryV2.newMemory(MemoryType.OBSERVATION, "", []);
    const timestamp = new Date();

    expect(memory.setLastAccessedTimestamp(timestamp)).toEqual(timestamp);
});

test('set lastAccessedTimestamp with default values still sets timestamp', () => {
    const memory = MemoryV2.newMemory(MemoryType.OBSERVATION, "", []);

    expect(memory.setLastAccessedTimestamp()).not.toBeNull();
});

test('construct memory with a referenced memory id should have referenced memory', () => {
    const referencedMemory = MemoryV2.newMemory(MemoryType.OBSERVATION, "", []);
    const memory = MemoryV2.newMemory(
        MemoryType.OBSERVATION,
        "",
        [],
        [referencedMemory.id]
    );

    expect(memory.referencedMemoryIds).toContain(referencedMemory.id);
});

test('construct memory with a description should have description', () => {
    const testDescription = "test description";
    const memory = MemoryV2.newMemory(
        MemoryType.OBSERVATION,
        testDescription,
        []
    );

    expect(memory.description).toContain(testDescription);
});

test('construct memory with a MemoryType should have memoryType', () => {
    const memory = MemoryV2.newMemory(MemoryType.REFLECTION, "", []);

    expect(memory.memoryType).toEqual(MemoryType.REFLECTION);
});

test('create memory and convert to JSON, and back to new memory should be equal', () => {
    const testDescription = "test description";
    const memory1 = MemoryV2.newMemory(MemoryType.OBSERVATION, testDescription, []);

    const memory1Json = memory1.toJson()
    const memory2 = MemoryV2.fromJson(memory1Json)

    expect(memory1).toEqual(memory2);
});
