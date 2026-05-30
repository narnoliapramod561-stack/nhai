import { FaceLandmarks } from '../../detection/DetectionTypes';
import { SmileResult } from './ActiveLivenessTypes';

/**
 * Detects a smile using the ratio between mouth width and the distance
 * from the nose to the mouth. This is reliable with YuNet's 5 landmarks.
 */
export class SmileDetectionService {
  /** Require the mouth width ratio to increase by this percentage compared to baseline. */
  private static readonly MIN_SMILE_INCREASE = 1.15; // 15% increase
  /** How long the smile must be held continuously. */
  private static readonly HOLD_DURATION_MS = 300;

  private baselineRatio: number | null = null;
  private smileStartTimestamp: number | null = null;

  public reset(): void {
    this.baselineRatio = null;
    this.smileStartTimestamp = null;
  }

  public processFrame(landmarks: FaceLandmarks, timestampMs: number): SmileResult {
    const ratio = this.computeSmileRatio(landmarks);

    if (this.baselineRatio === null) {
      this.baselineRatio = ratio;
      return { detected: false };
    }

    const currentIncrease = ratio / this.baselineRatio;

    if (currentIncrease >= SmileDetectionService.MIN_SMILE_INCREASE) {
      if (this.smileStartTimestamp === null) {
        this.smileStartTimestamp = timestampMs;
      } else if (timestampMs - this.smileStartTimestamp >= SmileDetectionService.HOLD_DURATION_MS) {
        return { detected: true };
      }
    } else {
      // User stopped smiling, reset timer
      this.smileStartTimestamp = null;
    }

    return { detected: false };
  }

  private computeSmileRatio(landmarks: FaceLandmarks): number {
    const mouthLeft = landmarks.leftMouth;
    const mouthRight = landmarks.rightMouth;
    const nose = landmarks.nose;

    // Distance between left and right mouth corners
    const mouthWidth = Math.sqrt(
      Math.pow(mouthRight.x - mouthLeft.x, 2) + Math.pow(mouthRight.y - mouthLeft.y, 2)
    );

    // Midpoint of mouth
    const mouthMidpoint = {
      x: (mouthLeft.x + mouthRight.x) / 2,
      y: (mouthLeft.y + mouthRight.y) / 2,
    };

    // Distance from nose to mouth midpoint (vertical reference)
    const faceReference = Math.sqrt(
      Math.pow(mouthMidpoint.x - nose.x, 2) + Math.pow(mouthMidpoint.y - nose.y, 2)
    );

    if (faceReference === 0) return 1;

    return mouthWidth / faceReference;
  }
}
