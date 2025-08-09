import { MemoryStream } from "./memoryStream";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {MemoryType, MemoryV2} from "./memoryV2";

const TEST_FILE_PATH = path.join(os.tmpdir(), "memory-stream-test.json");

afterEach(() => {
  // Remove the file if the test created it
  try {
    fs.unlink(TEST_FILE_PATH);
  } catch (err) {
    // Ignore if the file doesn't exist; rethrow otherwise
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
    const memory = new MemoryV2(MemoryType.OBSERVATION);
    memoryStream.addMemory(memory)

    expect(memoryStream.memoryDb.length).toEqual(1);
    expect(memoryStream.memoryDb[0]).toEqual(memory);
})

test("add a memories to the memory stream adds a memories without changing previous", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory1 = new MemoryV2(MemoryType.OBSERVATION);
    const memory2 = new MemoryV2(MemoryType.REFLECTION);
    memoryStream.addMemory(memory1)
    memoryStream.addMemory(memory2)

    expect(memoryStream.memoryDb.length).toEqual(2);
    expect(memoryStream.memoryDb[0]).toEqual(memory1);
    expect(memoryStream.memoryDb[1]).toEqual(memory2);
})

test("add a memories to the memory stream, saveToDisk, and generating a new memory stream with the same path loads same memories", () => {
    const memoryStream = new MemoryStream(TEST_FILE_PATH);
    const memory1 = new MemoryV2(MemoryType.OBSERVATION);
    const memory2 = new MemoryV2(MemoryType.REFLECTION);
    memoryStream.addMemory(memory1)
    memoryStream.addMemory(memory2)
    memoryStream.saveToDisk();

    const newMemoryStream = new MemoryStream(TEST_FILE_PATH);

    expect(newMemoryStream.memoryDb.length).toEqual(memoryStream.memoryDb.length);
    expect(newMemoryStream.memoryDb[0]).toEqual(memoryStream.memoryDb[0]);
    expect(newMemoryStream.memoryDb[1]).toEqual(memoryStream.memoryDb[1]);
})
