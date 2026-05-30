import { FaceLandmarks } from '../detection/DetectionTypes';
import { FaceAlignmentService } from './FaceAlignmentService';
import { ClaheService } from './ClaheService';
import { AlignedFace, PreprocessingMetrics } from './PreprocessingTypes';

export class PreprocessingController {
  /**
   * Orchestrates the entire preprocessing pipeline inside the Worklet.
   * 
   * @param sourceBuffer The raw 320x320 RGB Float32Array from VisionCamera
   * @param landmarks The detected YuNet landmarks
   * @returns The enhanced, aligned 112x112 face crop and performance metrics
   */
  static processFace(
    sourceBuffer: Float32Array,
    landmarks: FaceLandmarks
  ): { alignedFace: AlignedFace; metrics: PreprocessingMetrics } {
    'worklet';
    
    const startAlignment = Date.now();
    
    // 1. Affine Alignment (Outputs 112x112)
    const alignedFace = FaceAlignmentService.alignFace(sourceBuffer, 320, landmarks);
    
    const startClahe = Date.now();
    const alignmentTimeMs = startClahe - startAlignment;
    
    // 2. Contrast Enhancement (Modifies buffer in-place)
    ClaheService.enhanceContrast(alignedFace);
    
    const endTime = Date.now();
    const claheTimeMs = endTime - startClahe;
    const totalPreprocessingTimeMs = endTime - startAlignment;

    return {
      alignedFace,
      metrics: {
        alignmentTimeMs,
        claheTimeMs,
        totalPreprocessingTimeMs
      }
    };
  }
}
