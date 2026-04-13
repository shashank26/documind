export const mergeChunkContents = (
  chunks: {
    content: string;
    chunkIndex: number;
  }[],
) => {
  const merged = [];
  for (let i = 0; i < chunks.length; i++) {
    const curr = chunks[i];
    const next = chunks[i + 1];

    if (next && next.chunkIndex + 1 === curr.chunkIndex) {
      merged.push(curr.content + '\n' + next.content);
      i++;
    } else {
      merged.push(curr.content);
    }
  }

  return merged;
};

export const limitContext = (chunks: string[]) => {
  const MAX_CHARS = 3000;

  let context = '';
  for (const chunk of chunks) {
    if (context.length + chunk.length > MAX_CHARS) break;
    context += chunk + '\n\n';
  }
  return context;
};
