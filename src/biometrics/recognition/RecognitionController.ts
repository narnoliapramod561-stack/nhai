import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { MobileFaceNetService } from './MobileFaceNetService';
import { RecognitionPerformance } from './RecognitionPerformance';
import {
  FaceEmbedding,
  RecognitionResult,
  RecognitionMetrics,
} from './RecognitionTypes';
import { AlignedFace } from '../preprocessing/PreprocessingTypes';

/**
 * React hook that orchestrates MobileFaceNet embedding extraction.
 *
 * Responsibilities:
 *  1. Loads the model via MobileFaceNetService (singleton).
 *  2. Exposes `extractEmbedding(alignedFace)` to consuming screens.
 *  3. Tracks rolling performance metrics.
 *  4. Prevents duplicate concurrent extractions.
 */
export const useRecognitionController = () => {
  // — State —
  const [lastEmbedding, setLastEmbedding] = useState<FaceEmbedding | null>(null);
  const [metrics, setMetrics] = useState<RecognitionMetrics>({
    inferenceTimeMs: 0,
    averageInferenceMs: 0,
    peakInferenceMs: 0,
    delegateUsed: 'unknown',
  });
  const [isExtracting, setIsExtracting] = useState(false);

  // Guard against concurrent calls.
  const extractionLock = useRef(false);

  // — Model —
  const { modelLoaded, modelError, extractEmbedding } =
    MobileFaceNetService.useMobileFaceNet();

  // Set the delegate label once the model is ready.
  if (modelLoaded && metrics.delegateUsed === 'unknown') {
    const delegate = Platform.OS === 'ios' ? 'core-ml' : 'android-gpu';
    RecognitionPerformance.setDelegate(delegate);
  }

  // — Public API —

  /**
   * Extracts a facial embedding from an already-aligned 112×112 face tensor.
   *
   * @param alignedFace  Output of PreprocessingController.processFace().
   * @returns The full RecognitionResult.
   */
  const extract = useCallback(
    (alignedFace: AlignedFace): RecognitionResult => {
      // Prevent overlapping extractions.
      if (extractionLock.current) {
        return {
          embedding: null,
          inferenceTimeMs: 0,
          success: false,
          errorMessage: 'Extraction already in progress',
        };
      }

      extractionLock.current = true;
      setIsExtracting(true);

      try {
        const result = extractEmbedding(alignedFace);

        if (result.success && result.embedding) {
          setLastEmbedding(result.embedding);
        }

        // Track performance.
        const updatedMetrics = RecognitionPerformance.track(result.inferenceTimeMs);
        setMetrics(updatedMetrics);

        return result;
      } finally {
        extractionLock.current = false;
        setIsExtracting(false);
      }
    },
    [extractEmbedding],
  );

  return {
    /** Whether the MobileFaceNet model has finished loading. */
    modelLoaded,
    /** Error encountered during model loading, if any. */
    modelError,
    /** The most recently extracted embedding. */
    lastEmbedding,
    /** Rolling performance metrics. */
    metrics,
    /** Whether an extraction is currently in progress. */
    isExtracting,
    /** Trigger embedding extraction for an aligned face. */
    extract,
  };
};
