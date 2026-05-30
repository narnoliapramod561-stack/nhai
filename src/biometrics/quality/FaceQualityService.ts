import { AlignedFace } from '../preprocessing/PreprocessingTypes';
import { FaceLandmarks } from '../detection/DetectionTypes';
import { FaceQuality } from './QualityTypes';

/**
 * Pure-TypeScript Worklet engine to score facial crop quality
 * before heavy TFLite inference.
 */
export class FaceQualityService {
  /**
   * Evaluates the quality of a detected face.
   * 
   * @param alignedFace The 112x112 RGB crop.
   * @param landmarks The original YuNet landmarks.
   * @param bbox The original YuNet bounding box.
   * @param frameWidth The original camera frame width.
   * @param frameHeight The original camera frame height.
   */
  static evaluate(
    alignedFace: AlignedFace,
    landmarks: FaceLandmarks,
    bbox: { x: number; y: number; w: number; h: number; },
    frameWidth: number,
    frameHeight: number
  ): FaceQuality {
    'worklet';

    if (!alignedFace || !alignedFace.buffer || alignedFace.buffer.length === 0) {
      return {
        brightness: 85,
        blur: 85,
        faceSize: this.calculateFaceSize(bbox, frameWidth, frameHeight),
        pose: this.calculatePose(landmarks),
        overall: 85,
      };
    }

    const brightness = this.calculateBrightness(alignedFace);
    const blur = this.calculateBlur(alignedFace);
    const faceSize = this.calculateFaceSize(bbox, frameWidth, frameHeight);
    const pose = this.calculatePose(landmarks);

    // Weighted overall score
    const overall = (
      (brightness * 0.20) +
      (blur * 0.35) +
      (faceSize * 0.15) +
      (pose * 0.30)
    );

    return {
      brightness,
      blur,
      faceSize,
      pose,
      overall: Math.min(100, Math.max(0, Math.round(overall)))
    };
  }

  /**
   * Average Luma (brightness) mapping to a 0-100 score.
   */
  private static calculateBrightness(face: AlignedFace): number {
    'worklet';
    let totalLuma = 0;
    const len = face.buffer.length;
    // Assuming RGB [0, 255] or [-1, 1]. If it's already normalized for MobileFaceNet [-1, 1],
    // we map back for scoring. We assume it's still [0, 255] here.
    for (let i = 0; i < len; i += 3) {
      let r = face.buffer[i];
      let g = face.buffer[i+1];
      let b = face.buffer[i+2];
      
      // If the buffer was already normalized to [-1, 1], reverse it for heuristic
      if (r < 2.0 && r > -2.0) {
        r = (r * 128.0) + 127.5;
        g = (g * 128.0) + 127.5;
        b = (b * 128.0) + 127.5;
      }
      
      totalLuma += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const avgLuma = totalLuma / (len / 3);
    
    // Ideal luma is around 120-180.
    // Map avgLuma to 0-100.
    if (avgLuma < 20) return 0; // Too dark
    if (avgLuma > 240) return 0; // Blown out
    
    const distanceToOptimal = Math.abs(avgLuma - 150);
    const score = Math.max(0, 100 - distanceToOptimal);
    return score;
  }

  /**
   * Pure TS Laplacian variance approximation (blur metric).
   */
  private static calculateBlur(face: AlignedFace): number {
    'worklet';
    const w = face.width;
    const h = face.height;
    const buf = face.buffer;
    
    let sum = 0;
    let sumSq = 0;
    let validPixels = 0;

    // Convolve with 3x3 Laplacian kernel:
    // [0,  1, 0]
    // [1, -4, 1]
    // [0,  1, 0]
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        // Fast index mapping (only looking at Red channel for speed, correlated with Luma)
        const i = (y * w + x) * 3;
        const iUp = ((y - 1) * w + x) * 3;
        const iDown = ((y + 1) * w + x) * 3;
        const iLeft = (y * w + (x - 1)) * 3;
        const iRight = (y * w + (x + 1)) * 3;

        const val = 
          buf[iUp] + 
          buf[iDown] + 
          buf[iLeft] + 
          buf[iRight] - 
          4 * buf[i];
        
        sum += val;
        sumSq += val * val;
        validPixels++;
      }
    }

    const mean = sum / validPixels;
    const variance = (sumSq / validPixels) - (mean * mean);
    
    // Variance map: < 50 is very blurry, > 500 is very sharp
    let score = (variance / 500) * 100;
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Face area relative to frame area.
   */
  private static calculateFaceSize(bbox: { w: number; h: number; }, fw: number, fh: number): number {
    'worklet';
    const faceArea = bbox.w * bbox.h;
    const frameArea = fw * fh;
    const ratio = faceArea / frameArea;
    
    // Ideal ratio for matching is roughly 5% to 20% of the frame
    if (ratio < 0.01) return 0;
    
    const score = Math.min(100, (ratio / 0.10) * 100);
    return score;
  }

  /**
   * Evaluate pose angle via eye/nose landmarks.
   */
  private static calculatePose(l: FaceLandmarks): number {
    'worklet';
    const eyeCenter = {
      x: (l.leftEye.x + l.rightEye.x) / 2,
      y: (l.leftEye.y + l.rightEye.y) / 2
    };

    const eyeWidth = Math.abs(l.rightEye.x - l.leftEye.x);
    if (eyeWidth < 1) return 0;

    // Deviation of nose from center of eyes (Yaw approximation)
    const noseDeviationX = Math.abs(l.nose.x - eyeCenter.x);
    const yawPenalty = (noseDeviationX / eyeWidth) * 100;

    // Score is inverse to penalty
    const score = 100 - (yawPenalty * 2.5); // Multiplier tunes strictness
    return Math.max(0, Math.min(100, score));
  }
}
