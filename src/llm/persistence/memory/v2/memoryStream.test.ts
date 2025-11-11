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

  expect(Array.from(memoryStream.memoryDb.values()).length).toEqual(0);
});

test("saveToDisk creates a new file with the given path", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    memoryStream.saveToDisk();

    return expect(fs.access(TEST_FILE_PATH)).resolves.not.toThrow();
})

test("add a memory to the memory stream adds a memory", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory = new MemoryV2(MemoryType.OBSERVATION, "", []);
    memoryStream.addMemory(memory)

    expect(memoryStream.memoryDb.size).toEqual(1);
    expect(memoryStream.memoryDb.get(memory.id)).toEqual(memory);
})

test("add a memories to the memory stream adds a memories without changing previous", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory1 = new MemoryV2(MemoryType.OBSERVATION, "", []);
    const memory2 = new MemoryV2(MemoryType.REFLECTION, "", []);
    memoryStream.addMemory(memory1)
    memoryStream.addMemory(memory2)

    expect(memoryStream.memoryDb.size).toEqual(2);
    expect(memoryStream.memoryDb.get(memory1.id)).toEqual(memory1);
    expect(memoryStream.memoryDb.get(memory2.id)).toEqual(memory2);
})

test("add a memories to the memory stream, saveToDisk, and generating a new memory stream with the same path loads same memories", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory1 = new MemoryV2(MemoryType.OBSERVATION, "", []);
    const memory2 = new MemoryV2(MemoryType.REFLECTION, "", []);
    memoryStream.addMemory(memory1)
    memoryStream.addMemory(memory2)
    memoryStream.saveToDisk();

    const newMemoryStream = new MemoryStream(TEST_FILE_PATH);

    expect(newMemoryStream.memoryDb.size).toEqual(Array.from(memoryStream.memoryDb.values()).length);
    expect(newMemoryStream.memoryDb.get(memory1.id)).toEqual(memoryStream.memoryDb.get(memory1.id));
    expect(newMemoryStream.memoryDb.get(memory2.id)).toEqual(memoryStream.memoryDb.get(memory2.id));
})

test("retrieveRelevantMemories filters by minScore and sorts by score descending", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();

    // Query memory provides the topic embedding
    const queried = new MemoryV2(MemoryType.OBSERVATION, "query", [1, 0]);

    // Same recency and importance; ordering driven by cosine similarity mapping
    const memA = new MemoryV2(MemoryType.OBSERVATION, "A", [1, 0]);   // cos=1 -> relevance=10
    memA.importance = 0;
    memA.setLastAccessedTimestamp(fetchTime); // max recency score of 10

    const memB = new MemoryV2(MemoryType.OBSERVATION, "B", [0, 1]);   // cos=0 -> relevance=5
    memB.importance = 0;
    memB.setLastAccessedTimestamp(fetchTime); // max recency score of 10

    const memC = new MemoryV2(MemoryType.OBSERVATION, "C", [-1, 0]);  // cos=-1 -> relevance=0
    memC.importance = 0;
    memC.setLastAccessedTimestamp(fetchTime); // max recency score of 10

    memoryStream.addMemory(memA);
    memoryStream.addMemory(memB);
    memoryStream.addMemory(memC);

    // With new weights: RECENCY_WEIGHT=0.65, IMPORTANCE_WEIGHT=0.75, RELEVANCE_WEIGHT=1.6
    // Recency=10 for all; totals: A=(10*0.65) + (0*0.75) + (10*1.6) = 6.5 + 0 + 16 = 22.5
    //                    B=(10*0.65) + (0*0.75) + (5*1.6) = 6.5 + 0 + 8 = 14.5
    //                    C=(10*0.65) + (0*0.75) + (0*1.6) = 6.5 + 0 + 0 = 6.5
    const result = memoryStream.retrieveRelevantMemories(queried, 13, fetchTime);

    expect(result.length).toBe(2);
    expect(result[0]).toBe(memA);
    expect(result[1]).toBe(memB);
});

test("retrieveRelevantMemories considers recency decay in ordering", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();

    const queried = new MemoryV2(MemoryType.OBSERVATION, "query", [1, 0]);

    const memRecent = new MemoryV2(MemoryType.OBSERVATION, "recent", [1, 0]);
    memRecent.importance = 0;
    memRecent.setLastAccessedTimestamp(fetchTime); // recency ~ 10

    const tenMinutesMs = 10 * 60 * 1000;
    const memOld = new MemoryV2(MemoryType.OBSERVATION, "old", [1, 0]);
    memOld.importance = 0;
    memOld.setLastAccessedTimestamp(new Date(fetchTime.getTime() - tenMinutesMs)); // recency decayed

    memoryStream.addMemory(memOld);
    memoryStream.addMemory(memRecent);

    const result = memoryStream.retrieveRelevantMemories(queried, 0, fetchTime);

    expect(result.length).toBe(2);
    // With identical embeddings and importance, more recent should rank higher
    expect(result[0]).toBe(memRecent);
    expect(result[1]).toBe(memOld);
});

test("retrieveRelevantMemories returns empty when minScore is above all totals", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();

    const queried = new MemoryV2(MemoryType.OBSERVATION, "query", [1, 0]);

    const mem = new MemoryV2(MemoryType.OBSERVATION, "only", [0, 1]); // relevance ~5, recency 10 => total ~15
    mem.importance = 0;
    mem.setLastAccessedTimestamp(fetchTime);
    memoryStream.addMemory(mem);

    // With new weights: RECENCY_WEIGHT=0.65, IMPORTANCE_WEIGHT=0.75, RELEVANCE_WEIGHT=1.6
    // Total score = (10*0.65) + (0*0.75) + (5*1.6) = 6.5 + 0 + 8 = 14.5
    // So minScore of 15 would be above all totals
    const result = memoryStream.retrieveRelevantMemories(queried, 15, fetchTime);
    expect(result.length).toBe(0);
});

test("getAllMemories returns all memories when no type is specified", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);

    const mem1 = new MemoryV2(MemoryType.OBSERVATION, "obs1", []);
    const mem2 = new MemoryV2(MemoryType.REFLECTION, "ref1", []);
    const mem3 = new MemoryV2(MemoryType.SEED, "seed1", []);

    memoryStream.addMemory(mem1);
    memoryStream.addMemory(mem2);
    memoryStream.addMemory(mem3);

    const result = memoryStream.getAllMemories();

    expect(result.length).toBe(3);
    // Ensure insertion order is preserved
    expect(result[0]).toBe(mem1);
    expect(result[1]).toBe(mem2);
    expect(result[2]).toBe(mem3);
});

test("getAllMemories filters by specified MemoryType", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);

    const mem1 = new MemoryV2(MemoryType.OBSERVATION, "obs1", []);
    const mem2 = new MemoryV2(MemoryType.REFLECTION, "ref1", []);
    const mem3 = new MemoryV2(MemoryType.OBSERVATION, "obs2", []);

    memoryStream.addMemory(mem1);
    memoryStream.addMemory(mem2);
    memoryStream.addMemory(mem3);

    const observations = memoryStream.getAllMemories(MemoryType.OBSERVATION);

    expect(observations).toHaveLength(2);
    expect(observations[0]).toBe(mem1);
    expect(observations[1]).toBe(mem3);

    // Ensure underlying db not mutated
    expect(memoryStream.memoryDb.size).toEqual(3);
});

test("getAllMemories returns empty array when no memories match the type", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);

    const mem = new MemoryV2(MemoryType.REFLECTION, "ref1", []);
    memoryStream.addMemory(mem);

    const seeds = memoryStream.getAllMemories(MemoryType.SEED);

    expect(Array.isArray(seeds)).toBe(true);
    expect(seeds).toHaveLength(0);
});

test("removeMemory removes the specified memory without affecting others", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);

    const mem1 = new MemoryV2(MemoryType.OBSERVATION, "obs1", []);
    const mem2 = new MemoryV2(MemoryType.REFLECTION, "ref1", []);
    const mem3 = new MemoryV2(MemoryType.SEED, "seed1", []);

    memoryStream.addMemory(mem1);
    memoryStream.addMemory(mem2);
    memoryStream.addMemory(mem3);

    expect(memoryStream.memoryDb.size).toBe(3);

    memoryStream.removeMemory(mem2.id);

    expect(memoryStream.memoryDb.size).toBe(2);
    expect(memoryStream.memoryDb.get(mem2.id)).toBeUndefined();

    const remaining = memoryStream.getAllMemories();
    expect(remaining).toEqual([mem1, mem3]);

    // Removing a non-existent id should be a no-op
    memoryStream.removeMemory("non-existent-id");
    expect(memoryStream.memoryDb.size).toBe(2);
});

test("retrieveRelevantMemories respects maxNumResults limit", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();

    const queried = new MemoryV2(MemoryType.OBSERVATION, "query", [1, 0]);

    // Construct memories with identical importance and recency, differing only by relevance
    const memA = new MemoryV2(MemoryType.OBSERVATION, "A", [1, 0]);   // cos=1 -> relevance=10
    memA.importance = 0;
    memA.setLastAccessedTimestamp(fetchTime); // recency ~ 10

    const memB = new MemoryV2(MemoryType.OBSERVATION, "B", [0, 1]);   // cos=0 -> relevance=5
    memB.importance = 0;
    memB.setLastAccessedTimestamp(fetchTime); // recency ~ 10

    const memC = new MemoryV2(MemoryType.OBSERVATION, "C", [-1, 0]);  // cos=-1 -> relevance=0
    memC.importance = 0;
    memC.setLastAccessedTimestamp(fetchTime); // recency ~ 10

    memoryStream.addMemory(memA);
    memoryStream.addMemory(memB);
    memoryStream.addMemory(memC);

    // With new weights: RECENCY_WEIGHT=0.65, IMPORTANCE_WEIGHT=0.75, RELEVANCE_WEIGHT=1.6
    // Totals: A ~ (10*0.65) + (0*0.75) + (10*1.6) = 6.5 + 0 + 16 = 22.5
    //         B ~ (10*0.65) + (0*0.75) + (5*1.6) = 6.5 + 0 + 8 = 14.5
    //         C ~ (10*0.65) + (0*0.75) + (0*1.6) = 6.5 + 0 + 0 = 6.5
    const result = memoryStream.retrieveRelevantMemories(queried, 0, fetchTime, 2);

    expect(result.length).toBe(2);
    expect(result[0]).toBe(memA);
    expect(result[1]).toBe(memB);
});

test("retrieveRelevantMemories returns empty array when maxNumResults is 0", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const fetchTime = new Date();

    const queried = new MemoryV2(MemoryType.OBSERVATION, "query", [1, 0]);

    const memA = new MemoryV2(MemoryType.OBSERVATION, "A", [1, 0]);
    memA.importance = 0;
    memA.setLastAccessedTimestamp(fetchTime);

    const memB = new MemoryV2(MemoryType.OBSERVATION, "B", [0, 1]);
    memB.importance = 0;
    memB.setLastAccessedTimestamp(fetchTime);

    memoryStream.addMemory(memA);
    memoryStream.addMemory(memB);

    const result = memoryStream.retrieveRelevantMemories(queried, 0, fetchTime, 0);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
});
