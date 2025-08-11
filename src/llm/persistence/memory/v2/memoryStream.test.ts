import { MemoryStream } from "./memoryStream";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {MemoryType, MemoryV2} from "./memoryV2";

const TEST_FILE_PATH = path.join(os.tmpdir(), "memory-stream-test.json");

afterEach(async () => {
  try {
    await fs.unlink(TEST_FILE_PATH);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
});

test("constructing a memory stream creates a new stream with given path", () => {
  const memoryStream = new MemoryStream(TEST_FILE_PATH);

  expect(memoryStream.memoryDb.length).toEqual(0);
});

test("saveToDisk creates a new file with the given path", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    memoryStream.saveToDisk();

    expect(fs.access(TEST_FILE_PATH)).resolves.not.toThrow();
})

test("add a memory to the memory stream adds a memory", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory = new MemoryV2(MemoryType.OBSERVATION, "", []);
    memoryStream.addMemory(memory)

    expect(memoryStream.memoryDb.length).toEqual(1);
    expect(memoryStream.memoryDb[0]).toEqual(memory);
})

test("add a memories to the memory stream adds a memories without changing previous", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory1 = new MemoryV2(MemoryType.OBSERVATION, "", []);
    const memory2 = new MemoryV2(MemoryType.REFLECTION, "", []);
    memoryStream.addMemory(memory1)
    memoryStream.addMemory(memory2)

    expect(memoryStream.memoryDb.length).toEqual(2);
    expect(memoryStream.memoryDb[0]).toEqual(memory1);
    expect(memoryStream.memoryDb[1]).toEqual(memory2);
})

test("add a memories to the memory stream, saveToDisk, and generating a new memory stream with the same path loads same memories", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory1 = new MemoryV2(MemoryType.OBSERVATION, "", []);
    const memory2 = new MemoryV2(MemoryType.REFLECTION, "", []);
    memoryStream.addMemory(memory1)
    memoryStream.addMemory(memory2)
    memoryStream.saveToDisk();

    const newMemoryStream = new MemoryStream(TEST_FILE_PATH);

    expect(newMemoryStream.memoryDb.length).toEqual(memoryStream.memoryDb.length);
    expect(newMemoryStream.memoryDb[0]).toEqual(memoryStream.memoryDb[0]);
    expect(newMemoryStream.memoryDb[1]).toEqual(memoryStream.memoryDb[1]);
})

test("retrieveRelevantMemories filters by minScore and sorts by score descending", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();
    const topicEmbedding = [1, 0]; // 2D for simplicity

    // Same recency and importance; ordering driven by cosine similarity mapping
    const memA = new MemoryV2(MemoryType.OBSERVATION, "A", [1, 0]);   // cos=1 -> relevance=10
    memA.importance = 0;
    memA.setLastAccessedTimestamp(fetchTime); // max recency score of 10

    const memB = new MemoryV2(MemoryType.OBSERVATION, "B", [0, 1]);   // cos=0 -> relevance=5
    memB.importance = 0;
    memA.setLastAccessedTimestamp(fetchTime); // max recency score of 10

    const memC = new MemoryV2(MemoryType.OBSERVATION, "C", [-1, 0]);  // cos=-1 -> relevance=0
    memC.importance = 0;
    memA.setLastAccessedTimestamp(fetchTime); // max recency score of 10

    memoryStream.addMemory(memA);
    memoryStream.addMemory(memB);
    memoryStream.addMemory(memC);

    // Recency=10 for all; totals: A=20, B=15, C=10
    const result = memoryStream.retrieveRelevantMemories(topicEmbedding, 15, fetchTime);

    expect(result.length).toBe(2);
    expect(result[0]).toBe(memA);
    expect(result[1]).toBe(memB);
});

test("retrieveRelevantMemories considers recency decay in ordering", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();
    const topicEmbedding = [1, 0];

    const memRecent = new MemoryV2(MemoryType.OBSERVATION, "recent", [1, 0]);
    memRecent.importance = 0;
    memRecent.setLastAccessedTimestamp(fetchTime); // recency ~ 10

    const tenMinutesMs = 10 * 60 * 1000;
    const memOld = new MemoryV2(MemoryType.OBSERVATION, "old", [1, 0]);
    memOld.importance = 0;
    memOld.setLastAccessedTimestamp(new Date(fetchTime.getTime() - tenMinutesMs)); // recency decayed

    memoryStream.addMemory(memOld);
    memoryStream.addMemory(memRecent);

    const result = memoryStream.retrieveRelevantMemories(topicEmbedding, 0, fetchTime);

    expect(result.length).toBe(2);
    // With identical embeddings and importance, more recent should rank higher
    expect(result[0]).toBe(memRecent);
    expect(result[1]).toBe(memOld);
});

test("retrieveRelevantMemories returns empty when minScore is above all totals", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();
    const topicEmbedding = [1, 0];

    const mem = new MemoryV2(MemoryType.OBSERVATION, "only", [0, 1]); // relevance ~5, recency 10 => total ~15
    mem.importance = 0;
    mem.setLastAccessedTimestamp(fetchTime);
    memoryStream.addMemory(mem);

    const result = memoryStream.retrieveRelevantMemories(topicEmbedding, 29, fetchTime);
    expect(result.length).toBe(0);
});
