import { FaceLandmarks } from '../../detection/DetectionTypes';

// ─── Smile Detection ───

export interface SmileResult {
  /** Whether a smile was detected based on mouth width expansion. */
  detected: boolean;
}

// ─── Head Pose ───

export interface HeadTurnResult {
  leftDetected: boolean;
  rightDetected: boolean;
}

// ─── Active Liveness ───

export interface ActiveLivenessResult {
  smilePassed: boolean;
  leftTurnPassed: boolean;
  rightTurnPassed: boolean;
  passed: boolean;
}

/**
 * Frame snapshot passed to active liveness detectors.
 * Carries the YuNet landmarks and the frame timestamp.
 */
export interface LivenessFrame {
  landmarks: FaceLandmarks;
  timestampMs: number;
}
