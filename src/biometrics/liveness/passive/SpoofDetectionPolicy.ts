import { PassiveLivenessResult, SpoofClassification } from './PassiveLivenessTypes';

/**
 * Configurable policy for interpreting MiniFASNet's raw softmax scores
 * into a binary live/spoof decision.
 *
 * Thresholds are tuned for NHAI field conditions where false rejections
 * of legitimate workers under harsh lighting are costlier than false accepts.
 */
export class SpoofDetectionPolicy {
  /**
   * Minimum realScore required to classify as LIVE.
   * Default: 0.70.  A higher value reduces FAR but may increase FRR under
   * challenging lighting (helmet shadows, direct sunlight).
   */
  private static readonly LIVE_THRESHOLD = 0.70;

  /**
   * Maximum realScore below which we are highly confident the input is FAKE.
   * Used for early rejection without additional processing.
   */
  private static readonly SPOOF_HARD_REJECT_THRESHOLD = 0.30;

  /**
   * Evaluates the MiniFASNet classification against the configured policy.
   *
   * @param classification Raw model output.
   * @returns PassiveLivenessResult with a binary decision and confidence.
   */
  static evaluate(classification: SpoofClassification): PassiveLivenessResult {
    const { realScore, fakeScore } = classification;

    const isLive = realScore >= SpoofDetectionPolicy.LIVE_THRESHOLD;
    const confidence = isLive ? realScore : fakeScore;
    const spoofProbability = fakeScore;

    return {
      isLive,
      confidence,
      spoofProbability,
    };
  }

  /**
   * Returns true if the spoof probability is so high that we can reject
   * immediately without additional processing.
   */
  static isHardReject(classification: SpoofClassification): boolean {
    return classification.realScore < SpoofDetectionPolicy.SPOOF_HARD_REJECT_THRESHOLD;
  }
}
