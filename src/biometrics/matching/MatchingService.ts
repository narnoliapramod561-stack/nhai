import { MatchResult, ThresholdConfig } from './MatchingTypes';
import { SimilarityEngine } from './SimilarityEngine';
import { ThresholdPolicy } from './ThresholdPolicy';

/**
 * Stateless service that orchestrates the matching logic.
 */
export class MatchingService {
  /**
   * Performs an offline 1:1 biometric comparison between two normalized embeddings.
   * 
   * @param storedEmbedding The reference embedding (e.g., from local database)
   * @param liveEmbedding The newly extracted embedding from the camera
   * @param config Optional threshold tuning overrides
   * @returns MatchResult containing the final decision and score
   */
  static evaluateMatch(
    storedEmbedding: Float32Array,
    liveEmbedding: Float32Array,
    config: ThresholdConfig = ThresholdPolicy.DEFAULT_CONFIG
  ): MatchResult {
    const startTime = Date.now(); // Date.now() is natively supported in React Native

    // 1. Calculate Cosine Similarity
    const score = SimilarityEngine.cosineSimilarity(storedEmbedding, liveEmbedding);

    // 2. Apply Threshold Policy
    const decision = ThresholdPolicy.evaluate(score, config);
    const confidence = ThresholdPolicy.calculateConfidence(score, config);

    const timeMs = Date.now() - startTime;

    return {
      score,
      decision,
      confidence,
      timeMs,
    };
  }
}
