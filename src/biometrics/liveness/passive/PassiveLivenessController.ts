import { AlignedFace } from '../../preprocessing/PreprocessingTypes';
import { MiniFASNetService } from './MiniFASNetService';
import { SpoofDetectionPolicy } from './SpoofDetectionPolicy';
import { PassiveLivenessResult } from './PassiveLivenessTypes';

/**
 * Controller wrapping MiniFASNet inference and the SpoofDetectionPolicy.
 *
 * Usage:
 *   const { classify } = MiniFASNetService.useMiniFASNet();
 *   const controller = new PassiveLivenessController(classify);
 *   const result = controller.evaluate(alignedFace);
 */
export class PassiveLivenessController {
  constructor(
    private classifyFn: (face: AlignedFace) => { realScore: number; fakeScore: number; inferenceTimeMs: number }
  ) {}

  /**
   * Runs the MiniFASNet model on the aligned face crop and evaluates the
   * result against the SpoofDetectionPolicy.
   *
   * @param alignedFace 112×112 aligned face tensor from the preprocessing pipeline.
   * @returns PassiveLivenessResult with isLive, confidence, and spoofProbability.
   */
  public evaluate(alignedFace: AlignedFace): PassiveLivenessResult {
    const classification = this.classifyFn(alignedFace);

    return SpoofDetectionPolicy.evaluate(classification);
  }

  /**
   * Returns true if the spoof signal is overwhelmingly strong (hard reject).
   */
  public isDefiniteSpoof(alignedFace: AlignedFace): boolean {
    const classification = this.classifyFn(alignedFace);
    return SpoofDetectionPolicy.isHardReject(classification);
  }
}
