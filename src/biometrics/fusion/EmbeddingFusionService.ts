import { EmbeddingUtils } from '../recognition/EmbeddingUtils';
import { FusionResult } from './FusionTypes';

/**
 * Multi-Frame Embedding Fusion Service.
 * Averages a collection of embeddings gathered over a ~1 second window
 * to create a single, highly robust composite embedding.
 */
export class EmbeddingFusionService {
  private static readonly REQUIRED_SAMPLES = 3;
  private static readonly MAX_SAMPLES = 5;

  /**
   * Fuses an array of embeddings via element-wise averaging and subsequent L2 normalization.
   * 
   * @param embeddings Array of 192-d L2-normalized Float32Arrays.
   * @returns FusionResult if successful, or null if insufficient samples.
   */
  static fuse(embeddings: Float32Array[]): FusionResult | null {
    'worklet';

    if (embeddings.length < this.REQUIRED_SAMPLES) {
      return null;
    }

    const samplesUsed = Math.min(embeddings.length, this.MAX_SAMPLES);
    const dim = embeddings[0].length; // Assumed 192
    
    // 1. Element-wise Average
    const fusedVector = new Float32Array(dim);
    
    for (let i = 0; i < samplesUsed; i++) {
      const emb = embeddings[i];
      for (let j = 0; j < dim; j++) {
        fusedVector[j] += emb[j];
      }
    }

    for (let j = 0; j < dim; j++) {
      fusedVector[j] /= samplesUsed;
    }

    // 2. Compute Variance (average squared distance from the mean)
    let varianceSum = 0;
    for (let i = 0; i < samplesUsed; i++) {
      const emb = embeddings[i];
      let distSq = 0;
      for (let j = 0; j < dim; j++) {
        const diff = emb[j] - fusedVector[j];
        distSq += diff * diff;
      }
      varianceSum += distSq;
    }
    const varianceScore = varianceSum / samplesUsed;

    // 3. Re-normalize the averaged vector so cosine matching works
    EmbeddingUtils.l2Normalize(fusedVector);

    return {
      embedding: fusedVector,
      samplesUsed,
      varianceScore,
    };
  }
}
