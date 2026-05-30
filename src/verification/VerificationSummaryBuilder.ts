import { VerificationSummary } from './VerificationTypes';
import { MatchDecision } from '../biometrics/matching/MatchingTypes';

/**
 * Generates human-readable verification summaries for audit trails and UI display.
 * Pure TypeScript. No UI rendering.
 */
export class VerificationSummaryBuilder {
  /**
   * Builds a structured explainability summary from the raw matching output.
   *
   * @param matchScore Cosine similarity score from the matching engine.
   * @param qualityScore Overall quality score from FaceQualityService.
   * @param livenessPassed Whether the liveness state machine completed successfully.
   * @param decision The final MATCH / RETRY / FAIL decision.
   * @param verificationTimeMs Total wall-clock time for the verification flow.
   */
  static build(
    matchScore: number,
    qualityScore: number,
    livenessPassed: boolean,
    decision: MatchDecision | string,
    verificationTimeMs: number
  ): VerificationSummary {
    return {
      matchScore: parseFloat(matchScore.toFixed(4)),
      qualityScore: Math.round(qualityScore),
      livenessPassed,
      decision: this.mapDecisionToVerdict(decision, livenessPassed),
      verificationTimeMs: Math.round(verificationTimeMs),
    };
  }

  /**
   * Formats a VerificationSummary into a human-readable string.
   */
  static format(summary: VerificationSummary): string {
    return [
      `Match Score: ${summary.matchScore}`,
      `Quality Score: ${summary.qualityScore}`,
      `Liveness: ${summary.livenessPassed ? 'PASSED' : 'FAILED'}`,
      `Decision: ${summary.decision}`,
      `Time: ${summary.verificationTimeMs}ms`,
    ].join('\n');
  }

  // --- Private ---

  private static mapDecisionToVerdict(decision: MatchDecision | string, livenessPassed: boolean): string {
    if (!livenessPassed) return 'REJECTED_LIVENESS';

    switch (decision) {
      case MatchDecision.MATCH:
      case 'MATCH':
        return 'VERIFIED';
      case MatchDecision.RETRY:
      case 'RETRY':
        return 'RETRY';
      case MatchDecision.FAIL:
      case 'FAIL':
        return 'REJECTED';
      default:
        return 'UNKNOWN';
    }
  }
}
