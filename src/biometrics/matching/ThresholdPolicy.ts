import { MatchDecision, ThresholdConfig } from './MatchingTypes';

export class ThresholdPolicy {
  // Default MobileFaceNet configuration tuned for construction site conditions
  public static readonly DEFAULT_CONFIG: ThresholdConfig = {
    matchThreshold: 0.80,
    retryThreshold: 0.70,
  };

  /**
   * Maps a raw similarity score to a discrete business decision.
   */
  static evaluate(score: number, config: ThresholdConfig = this.DEFAULT_CONFIG): MatchDecision {
    if (score >= config.matchThreshold) {
      return MatchDecision.MATCH;
    }
    if (score >= config.retryThreshold) {
      return MatchDecision.RETRY;
    }
    return MatchDecision.FAIL;
  }

  /**
   * Translates the raw cosine similarity score into a human-readable 
   * confidence percentage [0, 100].
   */
  static calculateConfidence(score: number, config: ThresholdConfig = this.DEFAULT_CONFIG): number {
    // Scores below 0 are radically different subjects
    if (score <= 0) return 0;
    
    // Scores above match threshold approach 100%
    if (score >= config.matchThreshold) {
      // Map [matchThreshold, 1.0] -> [90, 100]
      const range = 1.0 - config.matchThreshold;
      const progress = (score - config.matchThreshold) / range;
      return Math.min(100, Math.round(90 + (progress * 10)));
    }
    
    // Scores in retry range map to [50, 89]
    if (score >= config.retryThreshold) {
      const range = config.matchThreshold - config.retryThreshold;
      const progress = (score - config.retryThreshold) / range;
      return Math.round(50 + (progress * 39));
    }

    // Scores below retry map to [1, 49]
    const progress = score / config.retryThreshold;
    return Math.round(progress * 49);
  }
}
