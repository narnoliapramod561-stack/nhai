import { RecognitionMetrics } from './RecognitionTypes';

/**
 * Tracks rolling performance metrics for MobileFaceNet inference.
 * Mirrors the DetectionPerformance pattern for consistency.
 */
export class RecognitionPerformance {
  private static history: number[] = [];
  private static readonly MAX_HISTORY = 30;
  private static peakMs = 0;
  private static delegate: RecognitionMetrics['delegateUsed'] = 'unknown';

  /**
   * Records the delegate that was selected during model loading.
   * Called once after the model finishes initialising.
   */
  static setDelegate(delegate: RecognitionMetrics['delegateUsed']): void {
    this.delegate = delegate;
  }

  /**
   * Records a single inference timing and returns updated aggregate metrics.
   */
  static track(inferenceTimeMs: number): RecognitionMetrics {
    this.history.push(inferenceTimeMs);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    if (inferenceTimeMs > this.peakMs) {
      this.peakMs = inferenceTimeMs;
    }

    const sum = this.history.reduce((a, b) => a + b, 0);
    const avg = this.history.length > 0 ? sum / this.history.length : 0;

    return {
      inferenceTimeMs,
      averageInferenceMs: avg,
      peakInferenceMs: this.peakMs,
      delegateUsed: this.delegate,
    };
  }

  /** Resets all tracked metrics. */
  static reset(): void {
    this.history = [];
    this.peakMs = 0;
  }
}
