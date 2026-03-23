export class Chunk {
  public id: string;
  public data: string;
  public length: number;
  public embedding?: number[];
  public tokenLength: number;
  constructor({
    data,
    id,
    length,
    embedding,
    tokenLength,
  }: {
    id: string;
    data: string;
    length: number;
    embedding?: number[];
    tokenLength: number;
  }) {
    this.id = id;
    this.data = data;
    this.embedding = embedding;
    this.length = length;
    this.tokenLength = tokenLength;
  }
}
