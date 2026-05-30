/**
 * Utility functions for facial embedding operations.
 * All methods are worklet-compatible (pure math, no bridge calls).
 */
export class EmbeddingUtils {
  /**
   * L2-normalizes an embedding vector in-place.
   * After normalization, cosine similarity == dot product.
   *
   * @param vector The raw embedding from MobileFaceNet.
   * @returns The same Float32Array, now unit-length.
   */
  static l2Normalize(vector: Float32Array): Float32Array {
    'worklet';

    let sumSquares = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSquares += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSquares);

    // Guard against zero-vector (corrupted inference)
    if (norm < 1e-10) return vector;

    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }

    return vector;
  }

  /**
   * Computes cosine similarity between two L2-normalized embeddings.
   * Since both vectors are unit-length, this is simply the dot product.
   *
   * @returns Similarity score in [-1, 1]. Higher = more similar.
   */
  static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    'worklet';

    if (a.length !== b.length) return -1;

    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  /**
   * Prepares the 112×112 aligned face buffer for MobileFaceNet input.
   *
   * MobileFaceNet expects pixel values normalized to [-1, 1]:
   *   normalized = (pixel - 127.5) / 128.0
   *
   * The resize plugin outputs float32 in [0, 255] range when using
   * `dataType: 'float32'`, so we must rescale.
   *
   * Modifies the buffer in-place to avoid allocation.
   *
   * @param buffer The 112×112×3 Float32Array from PreprocessingController.
   */
  static normalizeForMobileFaceNet(buffer: Float32Array): void {
    'worklet';

    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = (buffer[i] - 127.5) / 128.0;
    }
  }
}
