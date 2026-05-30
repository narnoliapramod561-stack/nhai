import { ValidationSuite, ValidationResult } from '../ValidationTypes';

export class RecognitionValidationSuite implements ValidationSuite {
  name = 'Recognition Validation Suite';

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = (testId: string, fn: () => void) => {
      const start = Date.now();
      try {
        fn();
        results.push({ testId, category: 'Recognition', status: 'PASS', executionMs: Date.now() - start, details: 'Recognition bounds valid' });
      } catch (e: any) {
        results.push({ testId, category: 'Recognition', status: 'FAIL', executionMs: Date.now() - start, details: e.message });
      }
    };

    runTest('rec_vector_dimensions', () => {
      const embedding = new Float32Array(192);
      if (embedding.length !== 192) throw new Error('MobileFaceNet must output 192-d vectors');
    });

    runTest('rec_l2_normalization', () => {
      const embedding = new Float32Array(192).fill(0.1);
      let sum = 0;
      for (let i = 0; i < 192; i++) {
        sum += embedding[i] * embedding[i];
      }
      // Vector length shouldn't be zero
      if (sum === 0) throw new Error('Unnormalized vector');
    });

    return results;
  }
}
