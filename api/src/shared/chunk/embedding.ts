import { prisma } from '../db/prisma';
import { getTokenCount } from './chunker';

// Using ollama for local testing
export const embedBatch = async (texts: string[]) => {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      }),
    });

    const data = await res.json();
    embeddings.push(data.embedding);
  }

  return embeddings;
};

const toPgVector = (embedding: number[]) => `[${embedding.join(',')}]`;

embedBatch(['hello']).then(async (res) => {
  await prisma.$executeRaw`
  INSERT INTO document_chunks (id, document_id, content, embedding, token_length)
  VALUES (
    ${1},
    ${'doc-1'},
    ${'hello'},
    ${toPgVector(res[0])}::vector,
    ${getTokenCount('hello')}
  )
`;
});
