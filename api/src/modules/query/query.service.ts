import { prisma } from '../../shared/db/prisma';
import { getEmbedding, promptLLM } from '../../shared/gemeni/api';
import { extractCitations, getPreview } from './query.helper';

type HybridSearchResult = {
  content: string;
  semantic_score: number;
  keyword_score: number;
  final_score: number;
  chunk_index: number;
};

type Source = {
  id: number;
  chunkIndex: number;
  preview: string;
};

export class QueryService {
  async makeQueryUsingHybridSearch(documentId: string, query: string) {
    const embedding = await this.getQueryEmbedding(query);
    const hybridResults = await this.hybridSearch({
      documentId,
      query,
      embedding,
    });

    const filtered = hybridResults
      .filter((r) => r.semantic_score > 0.3)
      .slice(0, 5);

    console.log(
      filtered.map((r) => ({
        semantic: r.semantic_score,
        keyword: r.keyword_score,
        preview: getPreview(r.content),
      })),
    );

    const sources = filtered.map((c, i) => ({
      id: i + 1,
      chunkIndex: c.chunk_index,
      preview: c.content.slice(0, 150),
    }));

    const finalContext = filtered
      .map((c, i) => `(${i + 1}) ${c.content}`)
      .join('\n\n');
    const response = await this.promptModel(
      finalContext,
      query,
      filtered?.[0].final_score ?? 0,
      sources,
    );
    return response;
  }

  async getQueryEmbedding(query: string) {
    try {
      const data = await getEmbedding(query);
      return data;
    } catch (err) {
      throw new Error('Failed to generate query embedding');
    }
  }

  async promptModel(
    context: string,
    query: string,
    confidence: number,
    sources: Source[],
  ) {
    const prompt = `
You are a helpful assistant.

You MUST follow ALL rules strictly:

1. Answer ONLY using the provided context
2. Every sentence MUST include at least one citation like [1], [2]
3. Do NOT write any sentence without a citation
4. Do NOT include any information that is not directly supported by the context
5. Do NOT add explanations, examples, or conclusions beyond the context
6. If you cannot fully answer using the context, respond ONLY with: "I don't know"
7. Keep the answer concise (2-4 sentences)

FORMAT RULES:
- Place citations at the end of each sentence
- Do NOT put citations on a separate line

FORMAT EXAMPLE:
Neural networks are machine learning models [1]. They consist of layers of neurons that process data [1][2].

Context:
${context}

Question:
${query}
`;
    try {
      const answer = await promptLLM(prompt);
      const citations = extractCitations(answer);

      return {
        response: {
          answer: answer,
          citations,
          confidence,
          sources: sources.filter((s) => citations.includes(s.id)),
        },
      };
    } catch (err) {
      console.error(err);
      throw new Error('Failed to generate prompt answer');
    }
  }

  async getNNResults(
    documentId: string,
    embedding: number[],
  ): Promise<
    {
      content: string;
      documentId: string;
      chunk_index: number;
    }[]
  > {
    const vector = `[${embedding.join(',')}]`;
    const res: any =
      await prisma.$queryRawUnsafe(`SELECT content, document_id, chunk_index, embedding <=> CAST('${vector}' AS vector) AS distance
                FROM document_chunks
                WHERE document_id = '${documentId}'
                ORDER BY embedding <=> CAST('${vector}' AS vector)
                LIMIT 5;`);

    const filtered = res.filter((row) => row.distance < 0.5);
    const seen = new Set();

    const unique = filtered.filter((c) => {
      const key = c.content.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique;
  }

  async hybridSearch({
    documentId,
    query,
    embedding,
  }: {
    documentId: string;
    query: string;
    embedding: number[];
  }): Promise<HybridSearchResult[]> {
    const vector = `[${embedding.join(',')}]`;

    const res: any = await prisma.$queryRawUnsafe(
      `
      SELECT 
  content,
  chunk_index,

  -- semantic similarity (cosine → similarity)
  (1 - (embedding <=> $2::vector)) AS semantic_score,

  -- keyword relevance (normalized + stable)
  ts_rank(
    content_tsv,
    plainto_tsquery('english', $3),
    32
  ) AS keyword_score,

  -- final combined score (balanced weights)
  (
    (1 - (embedding <=> $2::vector)) * 0.5 +
    ts_rank(
      content_tsv,
      plainto_tsquery('english', $3),
      32
    ) * 0.4 +
    CASE 
      WHEN content ILIKE '%' || $3 || '%' THEN 0.1
      ELSE 0
    END
  ) AS final_score

FROM document_chunks

WHERE document_id = $1

ORDER BY final_score DESC

LIMIT 20;
      `,
      documentId,
      vector,
      query,
    );

    return res;
  }
}
