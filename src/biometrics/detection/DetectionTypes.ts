export enum DetectionState {
  NO_FACE = 'NO_FACE',
  ONE_FACE = 'ONE_FACE',
  MULTIPLE_FACES = 'MULTIPLE_FACES',
}

export interface FaceLandmarks {
  rightEye: { x: number; y: number };
  leftEye: { x: number; y: number };
  nose: { x: number; y: number };
  rightMouth: { x: number; y: number };
  leftMouth: { x: number; y: number };
}

export interface FaceDetection {
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  confidence: number;
  landmarks: FaceLandmarks;
  isCentered: boolean;
}

export interface DetectionResult {
  faceCount: number;
  detections: FaceDetection[];
  largestFace: FaceDetection | null;
  inferenceTimeMs: number;
}

export interface PerformanceMetrics {
  inferenceTimeMs: number;
  averageInferenceTimeMs: number;
  fps: number;
  peakInferenceMs: number;
  memoryUsageEstimateMBps: number;
  thermalRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
