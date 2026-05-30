import { ValidationSuite, ValidationResult } from '../ValidationTypes';
import { AdaptiveThresholdPolicy } from '../../biometrics/matching/AdaptiveThresholdPolicy';
import { SimilarityEngine } from '../../biometrics/matching/SimilarityEngine';

export class MatchingValidationSuite implements ValidationSuite {
  name = 'Matching Validation Suite';

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = (testId: string, fn: () => void) => {
      const start = Date.now();
      try {
        fn();
        results.push({ testId, category: 'Matching', status: 'PASS', executionMs: Date.now() - start, details: 'Expected output matched' });
      } catch (e: any) {
        results.push({ testId, category: 'Matching', status: 'FAIL', executionMs: Date.now() - start, details: e.message });
      }
    };

    runTest('match_high_quality_threshold', () => {
      const thresholds = AdaptiveThresholdPolicy.getThresholds(90);
      if (thresholds.matchThreshold !== 0.60) throw new Error(`Expected 0.60, got ${thresholds.matchThreshold}`);
    });

    runTest('match_medium_quality_threshold', () => {
      const thresholds = AdaptiveThresholdPolicy.getThresholds(75);
      if (thresholds.matchThreshold !== 0.55) throw new Error(`Expected 0.55, got ${thresholds.matchThreshold}`);
    });

    runTest('match_low_quality_reject', () => {
      const thresholds = AdaptiveThresholdPolicy.getThresholds(60);
      if (thresholds.matchThreshold < 1.0) throw new Error(`Low quality should have unattainable match threshold`);
    });

    runTest('match_cosine_similarity', () => {
      // Dummy vectors
      const v1 = new Float32Array(192).fill(0.1);
      const v2 = new Float32Array(192).fill(0.1);
      const score = SimilarityEngine.cosineSimilarity(v1, v2);
      if (score < 0.99) throw new Error(`Identical vectors got score ${score}`);
    });

    return results;
  }
}
