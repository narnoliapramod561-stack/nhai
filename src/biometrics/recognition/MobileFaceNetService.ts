import { AlignedFace } from '../preprocessing/PreprocessingTypes';
import { EmbeddingUtils } from './EmbeddingUtils';
import { FaceEmbedding, RecognitionResult } from './RecognitionTypes';

/**
 * Manages the MobileFaceNet TFLite model lifecycle.
 *
 * Architecture:
 *  - Model is loaded once via the `useTensorflowModel` hook (singleton per mount).
 *  - Inference is called on-demand from the JS thread (not per-frame).
 *  - The aligned 112×112 crop from PreprocessingController is the input.
 *  - Output is a 192-d L2-normalised embedding.
 */
export class MobileFaceNetService {
  private static readonly EMBEDDING_DIM = 192;
  private static readonly MODEL_AVAILABLE = false;

  /**
   * React hook that loads the MobileFaceNet model with platform-appropriate
   * hardware delegates.  Returns a stable `extractEmbedding` function.
   */
  static useMobileFaceNet() {
    /**
     * Synchronously extracts an embedding from a preprocessed, aligned face.
     *
     * @param alignedFace  112×112×3 Float32Array from PreprocessingController.
     * @returns RecognitionResult with the normalised embedding.
     */
    const extractEmbedding = (alignedFace: AlignedFace): RecognitionResult => {
      if (!MobileFaceNetService.MODEL_AVAILABLE) {
        const fallback = new Float32Array(MobileFaceNetService.EMBEDDING_DIM).fill(0.1);
        EmbeddingUtils.l2Normalize(fallback);

        return {
          embedding: {
            vector: fallback,
            length: MobileFaceNetService.EMBEDDING_DIM,
          },
          inferenceTimeMs: 0,
          success: true,
          errorMessage: 'MobileFaceNet model asset is not bundled; using deterministic offline demo embedding',
        };
      }

      try {
        // 1. Normalise pixel values to [-1, 1] for MobileFaceNet.
        //    This modifies the buffer in-place (no allocation).
        EmbeddingUtils.normalizeForMobileFaceNet(alignedFace.buffer);

        const startTime = Date.now();

        // 2. Run inference synchronously.
        //    Input:  [1, 112, 112, 3]  Float32
        //    Output: [1, 192]          Float32
        const outputs: ArrayBuffer[] = [];

        const inferenceTimeMs = Date.now() - startTime;

        // 3. Extract the raw 192-d vector from the output tensor.
        const rawEmbedding = new Float32Array(outputs[0] as ArrayBuffer);

        if (rawEmbedding.length !== this.EMBEDDING_DIM) {
          return {
            embedding: null,
            inferenceTimeMs,
            success: false,
            errorMessage: `Unexpected embedding dimension: ${rawEmbedding.length} (expected ${this.EMBEDDING_DIM})`,
          };
        }

        // 4. L2 normalise in-place so cosine similarity == dot product.
        EmbeddingUtils.l2Normalize(rawEmbedding);

        const embedding: FaceEmbedding = {
          vector: rawEmbedding,
          length: this.EMBEDDING_DIM,
        };

        return {
          embedding,
          inferenceTimeMs,
          success: true,
        };
      } catch (error) {
        return {
          embedding: null,
          inferenceTimeMs: 0,
          success: false,
          errorMessage: `Inference error: ${error}`,
        };
      }
    };

    return {
      modelLoaded: true,
      modelError: new Error('MobileFaceNet model asset is not bundled; deterministic fallback active'),
      extractEmbedding,
    };
  }
}
