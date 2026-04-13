import { getEmbedding } from '../gemeni/api';
import { Chunk } from './Chunk';

const BATCH = 10;
const CONCURRENCY = 2;

export type EmbeddingData = { chunk: Chunk; error?: any };

// Using ollama for local testing
async function embedBatch(chunks: Chunk[]): Promise<EmbeddingData[]> {
  const response = await Promise.all(
    chunks.map(async (c) => {
      try {
        const text = c.data;
        const data = await getEmbedding(text);
        return {
          chunk: {
            ...c,
            embedding: data,
          },
        };
      } catch (err) {
        console.error(
          'Error during generation of embedding for chunk: ',
          c.data,
          '\nerror: ',
          err,
        );
        return {
          chunk: { ...c },
          error: err,
        };
      }
    }),
  );

  return response;
}

export async function* startEmbedding(chunks: Chunk[]) {
  let batches: Array<Chunk> = [];
  const parallelBatches: (() => Promise<EmbeddingData[]>)[] = [];
  for (let c of chunks) {
    if (batches.length >= BATCH) {
      const batch = [...batches];
      parallelBatches.push(() => {
        return embedBatch(batch);
      });
      batches = [];
    }
    batches.push(c);
  }
  if (batches.length > 0) {
    const batch = [...batches];
    parallelBatches.push(() => {
      return embedBatch(batch);
    });
  }

  for (let i = 0; i < parallelBatches.length; i += CONCURRENCY) {
    const promiseBatch: Promise<EmbeddingData[]>[] = [];
    for (let c = i; c < i + CONCURRENCY; c++) {
      if (parallelBatches[c]) {
        promiseBatch.push(parallelBatches[c]());
      }
    }
    const res = await Promise.all(promiseBatch);
    const flat = res.flat(1);
    for (let r of flat) {
      yield r;
    }
  }
}
