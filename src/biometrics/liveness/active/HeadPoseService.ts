import { FaceLandmarks } from '../../detection/DetectionTypes';
import { HeadTurnResult } from './ActiveLivenessTypes';

/**
 * Detects head turns (left / right) using the nose displacement relative
 * to the eye midpoint from YuNet's 5-point landmarks.
 *
 * When the head is centered, the nose x-coordinate sits near the midpoint
 * of the two eyes.  As the head turns left, the nose shifts right relative
 * to the eye midpoint (from the camera's perspective), and vice versa.
 *
 * We track a running baseline and flag a turn when the displacement ratio
 * exceeds a configurable threshold.
 */
export class HeadPoseService {
  /**
   * Minimum displacement ratio (nose offset / inter-ocular distance) required
   * to register a turn.  Empirically tuned for field conditions.
   */
  private static readonly TURN_THRESHOLD = 0.15;

  private hasDetectedLeft = false;
  private hasDetectedRight = false;

  // Running baseline (centered nose ratio) established from the first frame.
  private baselineRatio: number | null = null;

  /**
   * Resets internal state for a new liveness session.
   */
  public reset(): void {
    this.hasDetectedLeft = false;
    this.hasDetectedRight = false;
    this.baselineRatio = null;
  }

  /**
   * Processes a single frame's landmarks to detect head turn progression.
   *
   * @param landmarks YuNet 5-point face landmarks.
   * @returns HeadTurnResult with cumulative detection flags.
   */
  public processFrame(landmarks: FaceLandmarks): HeadTurnResult {
    const leftEye = landmarks.leftEye;
    const rightEye = landmarks.rightEye;
    const nose = landmarks.nose;

    // Inter-ocular distance
    const iod = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) +
      Math.pow(rightEye.y - leftEye.y, 2)
    );

    if (iod === 0) {
      return { leftDetected: this.hasDetectedLeft, rightDetected: this.hasDetectedRight };
    }

    // Eye midpoint
    const eyeMidX = (leftEye.x + rightEye.x) / 2;

    // Signed displacement: positive ⇒ nose is to the right of eye midpoint
    const displacementRatio = (nose.x - eyeMidX) / iod;

    // Establish baseline on the first frame
    if (this.baselineRatio === null) {
      this.baselineRatio = displacementRatio;
    }

    const delta = displacementRatio - this.baselineRatio;

    // Nose shifted right relative to baseline ⇒ head turned LEFT (from user perspective)
    if (delta > HeadPoseService.TURN_THRESHOLD) {
      this.hasDetectedLeft = true;
    }

    // Nose shifted left relative to baseline ⇒ head turned RIGHT (from user perspective)
    if (delta < -HeadPoseService.TURN_THRESHOLD) {
      this.hasDetectedRight = true;
    }

    return {
      leftDetected: this.hasDetectedLeft,
      rightDetected: this.hasDetectedRight,
    };
  }
}
