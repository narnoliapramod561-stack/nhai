export interface ThermalState {
  state: 'COOL' | 'WARM' | 'HOT';
  targetFps: number;
}

export class ThermalGovernor {
  /**
   * Dynamically throttles the detection FPS to prevent thermal runaway 
   * on low-end Android devices in hot outdoor environments.
   * 
   * Avoids native battery APIs; relies purely on inference latency decay.
   * 
   * @param averageInferenceMs The rolling average YuNet inference time.
   * @param peakInferenceMs The peak YuNet inference time.
   */
  static evaluate(averageInferenceMs: number, peakInferenceMs: number): ThermalState {
    
    // Spikes indicate thermal throttling by the OS scheduler
    if (averageInferenceMs > 150 || peakInferenceMs > 250) {
      return {
        state: 'HOT',
        targetFps: 3
      };
    }

    if (averageInferenceMs > 80 || peakInferenceMs > 120) {
      return {
        state: 'WARM',
        targetFps: 5
      };
    }

    return {
      state: 'COOL',
      targetFps: 8
    };
  }
}
