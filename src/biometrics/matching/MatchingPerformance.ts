import { MatchingMetrics } from './MatchingTypes';

/**
 * Tracks performance and throughput for the matching engine.
 */
export class MatchingPerformance {
  private static totalTimeMs = 0;
  private static peakMs = 0;
  private static count = 0;

  /**
   * Records a single match timing and returns updated aggregate metrics.
   */
  static track(matchTimeMs: number): MatchingMetrics {
    this.count++;
    this.totalTimeMs += matchTimeMs;

    if (matchTimeMs > this.peakMs) {
      this.peakMs = matchTimeMs;
    }

    const averageMatchTimeMs = this.totalTimeMs / this.count;

    return {
      averageMatchTimeMs,
      peakMatchTimeMs: this.peakMs,
      comparisonCount: this.count,
    };
  }

  /**
   * Resets all tracked metrics.
   */
  static reset(): void {
    this.totalTimeMs = 0;
    this.peakMs = 0;
    this.count = 0;
  }
}
