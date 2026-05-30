/**
 * Types for the MiniFASNet-based passive anti-spoof subsystem.
 */

export interface PassiveLivenessResult {
  /** Whether the face is classified as live (not a spoof). */
  isLive: boolean;
  /** Model confidence in the live classification (0.0 – 1.0). */
  confidence: number;
  /** Estimated probability that the face is a spoof (0.0 – 1.0). */
  spoofProbability: number;
}

export interface SpoofClassification {
  /** Raw model output: probability that the input is REAL. */
  realScore: number;
  /** Raw model output: probability that the input is FAKE. */
  fakeScore: number;
  /** Inference latency in milliseconds. */
  inferenceTimeMs: number;
}

/**
 * Types of presentation attacks the passive system is designed to catch.
 */
export enum SpoofAttackType {
  PRINTED_PHOTO = 'PRINTED_PHOTO',
  PHONE_SCREEN = 'PHONE_SCREEN',
  TABLET_REPLAY = 'TABLET_REPLAY',
  MONITOR_REPLAY = 'MONITOR_REPLAY',
  STATIC_IMAGE = 'STATIC_IMAGE',
  VIDEO_REPLAY = 'VIDEO_REPLAY',
}
