/**
 * Types for the Multi-Frame Embedding Fusion subsystem.
 */

/**
 * Output of the embedding fusion algorithm.
 */
export interface FusionResult {
  /** The final composite embedding (L2 normalized). */
  embedding: Float32Array;
  /** Number of valid embeddings used in the average (e.g., 3-5). */
  samplesUsed: number;
  /** Mathematical variance between the sampled embeddings. Lower is better. */
  varianceScore: number;
}
