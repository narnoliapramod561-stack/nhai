import { FaceLandmarks } from '../../detection/DetectionTypes';
import { SmileDetectionService } from './SmileDetectionService';
import { HeadPoseService } from './HeadPoseService';
import { ActiveLivenessResult, LivenessFrame } from './ActiveLivenessTypes';

/**
 * Controller that aggregates smile and head-turn detections into
 * a single ActiveLivenessResult.
 *
 * Usage:
 *  1. Call `reset()` at the start of a new verification attempt.
 *  2. Feed each camera frame via `processFrame()`.
 *  3. Read `getResult()` to check whether all active challenges have passed.
 */
export class ActiveLivenessController {
  private smileService = new SmileDetectionService();
  private headPoseService = new HeadPoseService();

  private smilePassed = false;

  /**
   * Resets all internal detector states.
   */
  public reset(): void {
    this.smileService.reset();
    this.headPoseService.reset();
    this.smilePassed = false;
  }

  /**
   * Processes a single camera frame through both detectors.
   *
   * @param frame LivenessFrame containing YuNet landmarks and timestamp.
   * @returns The cumulative ActiveLivenessResult.
   */
  public processFrame(frame: LivenessFrame): ActiveLivenessResult {
    // 1. Smile
    const smileResult = this.smileService.processFrame(frame.landmarks, frame.timestampMs);
    if (smileResult.detected) {
      this.smilePassed = true;
    }

    // 2. Head turns
    const headResult = this.headPoseService.processFrame(frame.landmarks);

    return this.getResult(headResult.leftDetected, headResult.rightDetected);
  }

  /**
   * Returns the current cumulative result.
   */
  public getResult(
    leftDetected: boolean = false,
    rightDetected: boolean = false
  ): ActiveLivenessResult {
    const smilePassed = this.smilePassed;
    const leftTurnPassed = leftDetected;
    const rightTurnPassed = rightDetected;
    const passed = smilePassed && leftTurnPassed && rightTurnPassed;

    return {
      smilePassed,
      leftTurnPassed,
      rightTurnPassed,
      passed,
    };
  }
}
