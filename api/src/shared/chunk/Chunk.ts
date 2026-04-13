export class Chunk {
  public data: string;
  public length: number;
  public embedding?: number[];
  public tokenLength: number;
  public chunkIndex: number;
  constructor({
    data,
    length,
    embedding,
    tokenLength,
    chunkIndex,
  }: {
    data: string;
    length: number;
    embedding?: number[];
    tokenLength: number;
    chunkIndex: number;
  }) {
    this.data = data;
    this.embedding = embedding;
    this.length = length;
    this.tokenLength = tokenLength;
    this.chunkIndex = chunkIndex;
  }
}
