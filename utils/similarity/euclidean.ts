export function euclideanSimilarity(vec1: number[], vec2: number[]): number {
    const distance = Math.sqrt(
      vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0)
    );
    // Convertit la distance en similarité (plus proche de 1 = plus similaire)
    return 1 / (1 + distance);
  }
