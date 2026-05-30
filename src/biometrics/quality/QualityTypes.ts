/**
 * Quality metrics evaluated on the raw face crop and landmarks prior to MobileFaceNet.
 */
export interface FaceQuality {
  /** Average Luma. Score [0-100]. */
  brightness: number;
  /** Laplacian Variance Approximation. Score [0-100]. */
  blur: number;
  /** Bounding box area relative to frame area. Score [0-100]. */
  faceSize: number;
  /** Landmark symmetry (yaw/pitch penalty). Score [0-100]. */
  pose: number;
  /** Weighted average of all sub-scores. Score [0-100]. */
  overall: number;
}
