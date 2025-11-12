// src/llm/persistence/memory/v2/shortTermMemory.test.ts
import fs from 'fs';
import path from 'path';
import os from 'os';

import { ShortTermMemory } from './shortTermMemory';
import { MemoryV2, MemoryType } from './memoryV2';

describe('ShortTermMemory', () => {
    const diskPath = path.join(os.tmpdir(), `test-short-term-memory.json${process.pid}-${Date.now()}.json`);

    afterEach(async () => {
        try {
            await fs.promises.unlink(diskPath);
        } catch (err) {
            // File might not exist, that's fine
            console.log(`Error deleting file: ${err}`);
        }
    });

    it('reads from disk on construction and populates memories', async () => {
        // Arrange: provide valid MemoryV2Data records
        const t1 = Date.UTC(2024, 0, 1, 0, 0, 0);
        const t2 = Date.UTC(2024, 0, 2, 12, 0, 0);

        const fileContent = JSON.stringify([
            {
                id: '1',
                createTimestamp: t1,
                lastAccessedTimestamp: t1,
                description: 'alpha',
                embedding: [],
                referencedMemoryIds: [],
                memoryType: MemoryType.OBSERVATION,
                importance: 0,
            },
            {
                id: '2',
                createTimestamp: t2,
                lastAccessedTimestamp: t2,
                description: 'beta',
                embedding: [],
                referencedMemoryIds: [],
                memoryType: MemoryType.OBSERVATION,
                importance: 0,
            },
        ]);

        await fs.promises.writeFile(diskPath, fileContent, 'utf-8');

        // Act
        const stm = new ShortTermMemory(5, diskPath);

        // Assert
        const formatted = stm.getShortTermMemoriesFormatedString();
        expect(formatted).toContain('alpha');
        expect(formatted).toContain('beta');
        // Ensure it produces two lines
        expect(formatted.split('\n')).toHaveLength(2);
        // Each line should contain the bullet point format
        expect(formatted).toMatch(/ {4}- \(.*\) .*alpha/);
        expect(formatted).toMatch(/ {4}- \(.*\) .*beta/);
    });

    it('handles missing file gracefully during construction', () => {
        // Act and assert
        expect(() => new ShortTermMemory(3, diskPath)).not.toThrow();
    });

    it('pushWithinBounds saves to disk and returns undefined when within capacity', async () => {
        // Arrange start with empty disk
        await fs.promises.writeFile(diskPath, '[]', 'utf-8');
        const stm = new ShortTermMemory(2, diskPath);
        const m1 = MemoryV2.newMemory(MemoryType.OBSERVATION, 'first', []);

        // Act
        const evicted = stm.pushWithinBounds(m1);

        // Assert
        expect(evicted).toBeUndefined();

        // Check that file was written to disk
        const fileContent = await fs.promises.readFile(diskPath, 'utf-8');
        const jsonWritten = JSON.parse(fileContent) as MemoryV2[];
        expect(Array.isArray(jsonWritten)).toBe(true);
        expect(jsonWritten).toHaveLength(1);
        expect(jsonWritten[0].description).toBe('first');
        expect(jsonWritten[0].memoryType).toBe(MemoryType.OBSERVATION);
    });

    it('pushWithinBounds evicts oldest when exceeding size and does not save to disk in that call', async () => {
        // Arrange
        await fs.promises.writeFile(diskPath, '[]', 'utf-8');
        const stm = new ShortTermMemory(1, diskPath);
        const m1 = MemoryV2.newMemory(MemoryType.OBSERVATION, 'old', []);
        const m2 = MemoryV2.newMemory(MemoryType.OBSERVATION, 'new', []);

        // First push (within size) triggers save
        const firstEvicted = stm.pushWithinBounds(m1);
        expect(firstEvicted).toBeUndefined();

        // Act: second push exceeds size, should evict oldest and NOT call saveMemoryToDisk
        const evicted = stm.pushWithinBounds(m2);

        // Assert
        expect(evicted).toBe(m1);

        const formatted = stm.getShortTermMemoriesFormatedString();
        expect(formatted).toContain('new');
        expect(formatted).not.toContain('old');
    });

    it('getShortTermMemoriesFormatedString returns empty string when no memories', async () => {
        // Arrange
        await fs.promises.writeFile(diskPath, '[]', 'utf-8');

        // Act
        const stm = new ShortTermMemory(5, diskPath);

        // Assert
        expect(stm.getShortTermMemoriesFormatedString()).toBe('');
    });
});
