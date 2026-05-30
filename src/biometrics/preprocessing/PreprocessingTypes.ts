export interface AlignedFace {
  buffer: Float32Array; // 112x112 RGB array
  width: number;
  height: number;
}

export interface PreprocessingMetrics {
  alignmentTimeMs: number;
  claheTimeMs: number;
  totalPreprocessingTimeMs: number;
}
