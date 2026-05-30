import { ActiveLivenessController } from './active/ActiveLivenessController';
import { ActiveLivenessResult, LivenessFrame } from './active/ActiveLivenessTypes';
import { PassiveLivenessController } from './passive/PassiveLivenessController';
import { PassiveLivenessResult } from './passive/PassiveLivenessTypes';
import { AlignedFace } from '../preprocessing/PreprocessingTypes';

/**
 * Combined result from the dual-layer liveness system.
 */
export interface DualLivenessResult {
  active: ActiveLivenessResult;
  passive: PassiveLivenessResult;
  /** True only when BOTH layers pass. */
  passed: boolean;
}

/**
 * Dual-Layer Liveness Decision Engine.
 *
 * Combines:
 *   Layer 1 — Active Liveness  (blink + head turns from YuNet landmarks)
 *   Layer 2 — Passive Anti-Spoof (MiniFASNet presentation attack detection)
 *
 * A verification attempt passes ONLY if both layers independently pass.
 * This makes it extremely difficult to spoof the system:
 *   • A printed photo cannot blink or turn.
 *   • A video replay will be flagged by MiniFASNet's moiré/texture analysis.
 */
export class DualLivenessController {
  private activeController = new ActiveLivenessController();

  constructor(private passiveController: PassiveLivenessController) {}

  /**
   * Resets both liveness layers for a new verification attempt.
   */
  public reset(): void {
    this.activeController.reset();
  }

  /**
   * Feeds a frame to the active liveness detector (landmark-based).
   * Call this for each camera frame during the challenge sequence.
   *
   * @param frame Frame containing YuNet landmarks and capture timestamp.
   * @returns The cumulative active liveness result.
   */
  public processActiveFrame(frame: LivenessFrame): ActiveLivenessResult {
    return this.activeController.processFrame(frame);
  }

  /**
   * Runs the passive anti-spoof model on the aligned face crop.
   * Should be called once, after a stable face is detected.
   *
   * @param alignedFace 112×112 aligned face tensor.
   * @returns The passive liveness result.
   */
  public evaluatePassive(alignedFace: AlignedFace): PassiveLivenessResult {
    return this.passiveController.evaluate(alignedFace);
  }

  /**
   * Combines both layers into the final dual-layer decision.
   *
   * @param activeResult Result from accumulated processActiveFrame calls.
   * @param passiveResult Result from evaluatePassive.
   * @returns DualLivenessResult with the AND-gated `passed` flag.
   */
  public decide(
    activeResult: ActiveLivenessResult,
    passiveResult: PassiveLivenessResult
  ): DualLivenessResult {
    return {
      active: activeResult,
      passive: passiveResult,
      passed: activeResult.passed && passiveResult.isLive,
    };
  }
}
