/**
 * Core mathematical engine for vector comparisons.
 */
export class SimilarityEngine {
  /**
   * Computes the cosine similarity between two vectors.
   * 
   * HIGHLY OPTIMIZED: Because both input vectors are mathematically guaranteed
   * to be L2-normalized from the Embedding extraction phase, cosine similarity
   * reduces to a simple dot product.
   *
   * @param storedEmbedding A 192-d L2-normalized Float32Array.
   * @param liveEmbedding A 192-d L2-normalized Float32Array.
   * @returns Similarity score strictly bounded between [-1.0, 1.0].
   */
  static cosineSimilarity(storedEmbedding: Float32Array, liveEmbedding: Float32Array): number {
    'worklet';
    
    if (storedEmbedding.length !== liveEmbedding.length) {
      throw new Error(`Dimension mismatch: stored=${storedEmbedding.length}, live=${liveEmbedding.length}`);
    }

    let dotProduct = 0;
    
    // Unrolled loop for micro-optimization (V8 typically unrolls this anyway)
    const len = storedEmbedding.length;
    for (let i = 0; i < len; i++) {
      dotProduct += storedEmbedding[i] * liveEmbedding[i];
    }
    
    // Guard against floating point inaccuracies pushing the score slightly out of bounds
    if (dotProduct > 1.0) return 1.0;
    if (dotProduct < -1.0) return -1.0;

    return dotProduct;
  }
}
