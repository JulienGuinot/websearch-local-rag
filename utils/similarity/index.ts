import { config } from "../../config/config";
import { cosineSimilarity } from "./cosine";
import { dotProduct } from "./dotproduct";
import { euclideanSimilarity } from "./euclidean";

export function calculateSimilarity(vec1: number[], vec2: number[]): number {
    switch (config.vectorStore.similarity) {
      case 'cosine':
        return cosineSimilarity(vec1, vec2);
      case 'euclidean':
        return euclideanSimilarity(vec1, vec2);
      case 'dot':
        return dotProduct(vec1, vec2);
      default:
        throw new Error(`Méthode de similarité non supportée: ${config.vectorStore.similarity}`);
    }
  }