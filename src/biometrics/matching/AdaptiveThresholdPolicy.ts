export interface ThresholdDecision {
  matchThreshold: number;
  retryThreshold: number;
  qualityBand: string;
}

export class AdaptiveThresholdPolicy {
  /**
   * Dynamically adjusts matching thresholds based on the FaceQuality score.
   * Solves the FAR/FRR tradeoff by requiring stricter matches for perfect photos,
   * but allowing slight leniency for harsh field conditions (helmets, shadows).
   * 
   * @param qualityOverall The 0-100 overall score from FaceQualityService
   * @returns Dynamic ThresholdDecision
   */
  static getThresholds(qualityOverall: number): ThresholdDecision {
    if (qualityOverall >= 85) {
      // High Quality (e.g. well-lit indoor enrollment)
      return {
        matchThreshold: 0.60,
        retryThreshold: 0.50,
        qualityBand: 'HIGH'
      };
    } else if (qualityOverall >= 70) {
      // Medium Quality (e.g. outdoor, slight shadow, helmet)
      return {
        matchThreshold: 0.55,
        retryThreshold: 0.40,
        qualityBand: 'MEDIUM'
      };
    } else {
      // Low Quality
      // Force a RETRY by setting match to unattainable 1.01
      return {
        matchThreshold: 1.01,
        retryThreshold: 0.00, // Everything falls into retry except <0
        qualityBand: 'LOW'
      };
    }
  }
}
