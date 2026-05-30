import { FaceLandmarks } from '../detection/DetectionTypes';
import { AlignedFace } from './PreprocessingTypes';

export class FaceAlignmentService {
  private static readonly TARGET_WIDTH = 112;
  private static readonly TARGET_HEIGHT = 112;
  
  // Standard MobileFaceNet/ArcFace reference points for 112x112
  private static readonly REF_LEFT_EYE = { x: 38.2946, y: 51.6963 };
  private static readonly REF_RIGHT_EYE = { x: 73.5318, y: 51.5014 };
  private static readonly REF_EYE_DISTANCE = 35.2372; // 73.5318 - 38.2946

  /**
   * Performs an affine transformation to perfectly align the face crop.
   * Operates purely in JS/Worklet memory for extreme performance.
   * 
   * @param sourceBuffer The raw 320x320 RGB float32 tensor
   * @param sourceWidth The width of the source buffer (e.g., 320)
   * @param landmarks The detected YuNet facial landmarks
   * @returns AlignedFace containing the 112x112 Float32Array
   */
  static alignFace(
    sourceBuffer: Float32Array, 
    sourceWidth: number, 
    landmarks: FaceLandmarks
  ): AlignedFace {
    'worklet';
    
    const targetBuffer = new Float32Array(this.TARGET_WIDTH * this.TARGET_HEIGHT * 3);
    
    // 1. Calculate transformation parameters based on eyes
    const dx = landmarks.rightEye.x - landmarks.leftEye.x;
    const dy = landmarks.rightEye.y - landmarks.leftEye.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Fallback if eyes overlap (corrupted detection)
    if (distance < 1) return { buffer: targetBuffer, width: this.TARGET_WIDTH, height: this.TARGET_HEIGHT };

    const scale = this.REF_EYE_DISTANCE / distance;
    const angle = Math.atan2(dy, dx);
    
    const cosTheta = Math.cos(angle);
    const sinTheta = Math.sin(angle);
    
    // Source eye center
    const srcCenterX = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
    const srcCenterY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
    
    // Target eye center
    const tgtCenterX = (this.REF_LEFT_EYE.x + this.REF_RIGHT_EYE.x) / 2;
    const tgtCenterY = (this.REF_LEFT_EYE.y + this.REF_RIGHT_EYE.y) / 2;

    // Build Inverse Affine Matrix to map target pixels back to source pixels
    // Target (u, v) -> Source (x, y)
    // x = srcCenterX + (u - tgtCenterX) * cos(a)/scale + (v - tgtCenterY) * sin(a)/scale
    // y = srcCenterY - (u - tgtCenterX) * sin(a)/scale + (v - tgtCenterY) * cos(a)/scale
    const invScale = 1.0 / scale;

    let targetIdx = 0;
    
    // 2. Perform Bilinear Interpolation
    for (let v = 0; v < this.TARGET_HEIGHT; v++) {
      const dy_v = (v - tgtCenterY) * invScale;
      
      for (let u = 0; u < this.TARGET_WIDTH; u++) {
        const dx_u = (u - tgtCenterX) * invScale;
        
        const srcX = srcCenterX + dx_u * cosTheta + dy_v * sinTheta;
        const srcY = srcCenterY - dx_u * sinTheta + dy_v * cosTheta;
        
        // Bounds check
        if (srcX >= 0 && srcX < sourceWidth - 1 && srcY >= 0 && srcY < sourceWidth - 1) {
          const x1 = Math.floor(srcX);
          const y1 = Math.floor(srcY);
          const x2 = x1 + 1;
          const y2 = y1 + 1;
          
          const a = srcX - x1;
          const b = srcY - y1;
          
          const idx11 = (y1 * sourceWidth + x1) * 3;
          const idx12 = (y1 * sourceWidth + x2) * 3;
          const idx21 = (y2 * sourceWidth + x1) * 3;
          const idx22 = (y2 * sourceWidth + x2) * 3;
          
          for (let c = 0; c < 3; c++) {
            const p11 = sourceBuffer[idx11 + c];
            const p12 = sourceBuffer[idx12 + c];
            const p21 = sourceBuffer[idx21 + c];
            const p22 = sourceBuffer[idx22 + c];
            
            // Bilinear interpolation
            const val = 
              p11 * (1 - a) * (1 - b) +
              p12 * a * (1 - b) +
              p21 * (1 - a) * b +
              p22 * a * b;
              
            targetBuffer[targetIdx + c] = val;
          }
        } else {
          // Out of bounds - fill with black
          targetBuffer[targetIdx] = 0;
          targetBuffer[targetIdx + 1] = 0;
          targetBuffer[targetIdx + 2] = 0;
        }
        
        targetIdx += 3;
      }
    }

    return {
      buffer: targetBuffer,
      width: this.TARGET_WIDTH,
      height: this.TARGET_HEIGHT
    };
  }
}
