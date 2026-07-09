import { chunkRows, runWithConcurrency } from "../batching.service";

describe("Batching Service", () => {
  describe("chunkRows", () => {
    it("should split rows into batches of the specified size", () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
      const batches = chunkRows(rows, 3);

      expect(batches).toHaveLength(4);
      expect(batches[0]).toHaveLength(3);
      expect(batches[1]).toHaveLength(3);
      expect(batches[2]).toHaveLength(3);
      expect(batches[3]).toHaveLength(1);
    });

    it("should handle a single batch when rows <= batchSize", () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
      const batches = chunkRows(rows, 10);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(5);
    });

    it("should handle empty rows", () => {
      const batches = chunkRows([], 5);
      expect(batches).toEqual([]);
    });

    it("should handle exact batch size multiple", () => {
      const rows = Array.from({ length: 6 }, (_, i) => ({ id: String(i) }));
      const batches = chunkRows(rows, 3);

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(3);
      expect(batches[1]).toHaveLength(3);
    });
  });

  describe("runWithConcurrency", () => {
    it("should process all items and return results in order", async () => {
      const items = [1, 2, 3, 4, 5];
      const results = await runWithConcurrency(items, 2, async (item) => {
        return item * 2;
      });

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it("should respect concurrency limit", async () => {
      let activeConcurrency = 0;
      let maxConcurrency = 0;

      const items = Array.from({ length: 10 }, (_, i) => i);
      await runWithConcurrency(items, 3, async () => {
        activeConcurrency++;
        maxConcurrency = Math.max(maxConcurrency, activeConcurrency);
        await new Promise((r) => setTimeout(r, 50));
        activeConcurrency--;
        return true;
      });

      expect(maxConcurrency).toBeLessThanOrEqual(3);
    });

    it("should handle empty items", async () => {
      const results = await runWithConcurrency([], 3, async (item) => item);
      expect(results).toEqual([]);
    });
  });
});
