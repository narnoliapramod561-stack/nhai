import { useState, useCallback } from 'react';
import { 
  DetectionState, 
  FaceDetection, 
  FaceLandmarks, 
  PerformanceMetrics,
  DetectionResult 
} from './DetectionTypes';
import { DetectionPerformance } from './DetectionPerformance';

export const useDetectionController = () => {
  const [detectionState, setDetectionState] = useState<DetectionState>(DetectionState.NO_FACE);
  const [faceCount, setFaceCount] = useState<number>(0);
  const [largestFace, setLargestFace] = useState<FaceDetection | null>(null);
  const [isCentered, setIsCentered] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [landmarks, setLandmarks] = useState<FaceLandmarks | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    inferenceTimeMs: 0,
    averageInferenceTimeMs: 0,
    fps: 0,
    peakInferenceMs: 0,
    memoryUsageEstimateMBps: 0,
    thermalRiskLevel: 'LOW',
  });

  const onDetection = useCallback((result: DetectionResult) => {
    // === DEBUG: Log every detection result arriving on JS thread ===
    if (result.largestFace) {
      const b = result.largestFace.bbox;
      console.log('[DET_CTRL] faceCount=' + result.faceCount + ' confidence=' + result.largestFace.confidence.toFixed(4) + ' isCentered=' + result.largestFace.isCentered + ' bbox={x:' + b.x.toFixed(1) + ',y:' + b.y.toFixed(1) + ',w:' + b.w.toFixed(1) + ',h:' + b.h.toFixed(1) + '}');
    } else {
      console.log('[DET_CTRL] faceCount=' + result.faceCount + ' (no largestFace)');
    }

    setFaceCount(result.faceCount);
    setLargestFace(result.largestFace);

    // Update performance metrics
    const metrics = DetectionPerformance.track(result.inferenceTimeMs);
    setPerformanceMetrics(metrics);

    // Determine state
    if (result.faceCount === 0) {
      console.log('[DET_CTRL] STATE => NO_FACE');
      setDetectionState(DetectionState.NO_FACE);
      setIsCentered(false);
      setConfidence(0);
      setLandmarks(null);
    } else if (result.faceCount === 1 && result.largestFace) {
      console.log('[DET_CTRL] STATE => ONE_FACE, isCentered=' + result.largestFace.isCentered);
      setDetectionState(DetectionState.ONE_FACE);
      setIsCentered(result.largestFace.isCentered);
      setConfidence(result.largestFace.confidence);
      setLandmarks(result.largestFace.landmarks);
    } else if (result.faceCount > 1) {
      console.log('[DET_CTRL] STATE => MULTIPLE_FACES');
      setDetectionState(DetectionState.MULTIPLE_FACES);
      if (result.largestFace) {
        setIsCentered(result.largestFace.isCentered);
        setConfidence(result.largestFace.confidence);
        setLandmarks(result.largestFace.landmarks);
      }
    }
  }, []);

  return {
    detectionState,
    faceCount,
    largestFace,
    isCentered,
    confidence,
    landmarks,
    performanceMetrics,
    onDetection,
  };
};
