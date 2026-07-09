import { config } from "../config";
import { logger } from "../logger";

/** Chunk rows into batches of configurable size */
export function chunkRows<T>(rows: T[], batchSize?: number): T[][] {
  const size = batchSize || config.batchSize;
  const batches: T[][] = [];

  for (let i = 0; i < rows.length; i += size) {
    batches.push(rows.slice(i, i + size));
  }

  logger.info(
    { totalRows: rows.length, batchSize: size, totalBatches: batches.length },
    "Rows chunked into batches",
  );

  return batches;
}

/**
 * Run async tasks with limited concurrency.
 * Returns results in order of input, not completion.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}
