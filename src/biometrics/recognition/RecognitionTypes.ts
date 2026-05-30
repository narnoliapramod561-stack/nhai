/**
 * Recognition module types for MobileFaceNet embedding extraction.
 */

/** A 192-dimensional L2-normalized facial embedding. */
export interface FaceEmbedding {
  /** The raw 192-d float array. */
  vector: Float32Array;
  /** Embedding dimensionality (always 192 for MobileFaceNet). */
  length: number;
}

/** Result returned after a single embedding extraction pass. */
export interface RecognitionResult {
  /** The extracted embedding, or null if extraction failed. */
  embedding: FaceEmbedding | null;
  /** Time taken for the MobileFaceNet inference in milliseconds. */
  inferenceTimeMs: number;
  /** Whether extraction succeeded. */
  success: boolean;
  /** Error message if extraction failed. */
  errorMessage?: string;
}

/** Aggregated performance tracking for the recognition model. */
export interface RecognitionMetrics {
  /** Last inference time in ms. */
  inferenceTimeMs: number;
  /** Rolling average inference time in ms. */
  averageInferenceMs: number;
  /** Highest recorded inference time in ms. */
  peakInferenceMs: number;
  /** The hardware delegate that was used. */
  delegateUsed: 'core-ml' | 'android-gpu' | 'nnapi' | 'cpu' | 'unknown';
}
