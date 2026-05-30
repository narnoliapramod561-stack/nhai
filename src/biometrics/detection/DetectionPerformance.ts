import { PerformanceMetrics } from './DetectionTypes';

export class DetectionPerformance {
  private static history: number[] = [];
  private static readonly MAX_HISTORY = 30;
  private static peakMs = 0;

  static track(inferenceTimeMs: number): PerformanceMetrics {
    this.history.push(inferenceTimeMs);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    if (inferenceTimeMs > this.peakMs) {
      this.peakMs = inferenceTimeMs;
    }

    const sum = this.history.reduce((a, b) => a + b, 0);
    const avg = this.history.length > 0 ? sum / this.history.length : 0;
    
    // FPS is capped to roughly the invocation frequency
    const fps = avg > 0 ? Math.min(60, 1000 / avg) : 0;
    
    // Memory estimate: 1.2MB per frame for the resize buffer (320x320x3 Float32)
    const memoryUsageEstimateMBps = 1.2 * fps;
    
    // Thermal risk: high if spending >400ms per second on inference computations
    const timeSpentPerSecondMs = avg * fps;
    let thermalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (timeSpentPerSecondMs > 400) {
      thermalRiskLevel = 'HIGH';
    } else if (timeSpentPerSecondMs > 200) {
      thermalRiskLevel = 'MEDIUM';
    }

    return {
      inferenceTimeMs,
      averageInferenceTimeMs: avg,
      fps,
      peakInferenceMs: this.peakMs,
      memoryUsageEstimateMBps,
      thermalRiskLevel,
    };
  }
}
