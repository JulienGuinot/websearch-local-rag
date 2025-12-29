import path from "path";
import { config } from "../config/config";
import { Chunk, VectorStoreConfig } from "../types/rag";
import { calculateSimilarity } from "../utils/similarity";

export class VectorStore {
  private chunks: Map<string, Chunk> = new Map();
  private readonly config: VectorStoreConfig =
    config.vectorStore as VectorStoreConfig;

  async addChunks(chunks: Chunk[]): Promise<void> {
    for (const chunk of chunks) {
      if (!chunk.embedding) {
        throw new Error(`Chunk ${chunk.id} n'a pas d'embedding`);
      }

      if (chunk.embedding.length !== this.config.dimensions) {
        throw new Error(
          `Dimension embedding incorrecte pour chunk ${chunk.id}`
        );
      }

      this.chunks.set(chunk.id, chunk);
    }
  }

  async search(
    queryEmbedding: number[],
    topK: number = config.retrieval.topK,
    threshold: number = config.retrieval.threshold
  ): Promise<Array<Chunk & { similarity: number }>> {
    if (queryEmbedding.length !== this.config.dimensions) {
      throw new Error("Dimension du query embedding incorrecte");
    }

    const results: Array<Chunk & { similarity: number }> = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) continue;

      const similarity = calculateSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= threshold) {
        results.push({
          ...chunk,
          similarity,
        });
      }
    }

    // Trie par similarité décroissante et prend les topK
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  async removeChunks(chunkIds: string[]): Promise<void> {
    for (const id of chunkIds) {
      this.chunks.delete(id);
    }
  }

  async removeBySource(source: string): Promise<void> {
    const toRemove: string[] = [];

    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.metadata.url === source || chunk.metadata.title === source) {
        toRemove.push(id);
      }
    }

    await this.removeChunks(toRemove);
  }

  async getChunk(id: string): Promise<Chunk | undefined> {
    return this.chunks.get(id);
  }

  listChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  async getStats(): Promise<{
    totalChunks: number;
    sources: Array<{ source: string; count: number }>;
    dimensions: number;
  }> {
    const sources = new Map<string, number>();

    for (const chunk of this.chunks.values()) {
      const source = chunk.metadata.url || chunk.metadata.title || "unknown";
      sources.set(source, (sources.get(source) || 0) + 1);
    }

    return {
      totalChunks: this.chunks.size,
      sources: Array.from(sources.entries()).map(([source, count]) => ({
        source,
        count,
      })),
      dimensions: this.config.dimensions,
    };
  }

  async clear(): Promise<void> {
    this.chunks.clear();
  }
}
