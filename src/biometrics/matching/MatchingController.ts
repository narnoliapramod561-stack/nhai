import { useState, useCallback, useRef } from 'react';
import { MatchingService } from './MatchingService';
import { MatchingPerformance } from './MatchingPerformance';
import { MatchResult, MatchingMetrics, ThresholdConfig } from './MatchingTypes';

/**
 * React hook that orchestrates biometric matching.
 * 
 * Responsibilities:
 * 1. Exposes `match(stored, live)` to consuming screens.
 * 2. Manages `isMatching` state to prevent concurrent match spam.
 * 3. Maintains `lastResult` and rolling `metrics`.
 */
export const useMatchingController = (config?: ThresholdConfig) => {
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [metrics, setMetrics] = useState<MatchingMetrics>({
    averageMatchTimeMs: 0,
    peakMatchTimeMs: 0,
    comparisonCount: 0,
  });

  // Guard against concurrent execution (e.g. rapid double taps)
  const matchLock = useRef(false);

  /**
   * Evaluates the similarity between a stored reference embedding and a live embedding.
   * Both embeddings must be 192D Float32Arrays that are L2-normalized.
   */
  const match = useCallback(
    (storedEmbedding: Float32Array, liveEmbedding: Float32Array): MatchResult | null => {
      if (matchLock.current) return null;

      matchLock.current = true;
      setIsMatching(true);

      try {
        const result = MatchingService.evaluateMatch(storedEmbedding, liveEmbedding, config);
        
        setLastResult(result);
        
        const updatedMetrics = MatchingPerformance.track(result.timeMs);
        setMetrics(updatedMetrics);

        return result;
      } finally {
        matchLock.current = false;
        setIsMatching(false);
      }
    },
    [config]
  );

  return {
    match,
    lastResult,
    metrics,
    isMatching,
  };
};
