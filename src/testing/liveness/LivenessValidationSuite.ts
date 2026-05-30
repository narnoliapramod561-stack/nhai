import { ValidationSuite, ValidationResult } from '../ValidationTypes';
import { ActiveLivenessController } from '../../biometrics/liveness/active/ActiveLivenessController';
import { DualLivenessController } from '../../biometrics/liveness/DualLivenessController';

export class LivenessValidationSuite implements ValidationSuite {
  name = 'Liveness Validation Suite';

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = (testId: string, fn: () => void) => {
      const start = Date.now();
      try {
        fn();
        results.push({ testId, category: 'Liveness', status: 'PASS', executionMs: Date.now() - start, details: 'Logic passed' });
      } catch (e: any) {
        results.push({ testId, category: 'Liveness', status: 'FAIL', executionMs: Date.now() - start, details: e.message });
      }
    };

    runTest('live_active_controller_state', () => {
      const active = new ActiveLivenessController();
      active.reset();
      const mockLandmarks = {
        rightEye: {x: 10, y: 10}, leftEye: {x: 20, y: 10},
        nose: {x: 15, y: 15}, rightMouth: {x: 12, y: 20}, leftMouth: {x: 18, y: 20}
      };
      
      const res1 = active.processFrame({ landmarks: mockLandmarks, timestampMs: Date.now() });
      if (res1.passed) throw new Error('Passed too early');
    });

    runTest('live_dual_and_gate', () => {
      const mockPassive: any = { evaluate: () => ({ isLive: true, confidence: 0.99, spoofProbability: 0.01 }) };
      const dual = new DualLivenessController(mockPassive);
      
      const activeRes = { smilePassed: true, leftTurnPassed: true, rightTurnPassed: true, passed: true };
      const passiveRes = { isLive: false, confidence: 0.1, spoofProbability: 0.9 }; // Passive FAILS
      
      const decision = dual.decide(activeRes, passiveRes);
      if (decision.passed) throw new Error('Dual gate passed when passive failed');
      
      const decision2 = dual.decide(activeRes, { isLive: true, confidence: 0.99, spoofProbability: 0.01 });
      if (!decision2.passed) throw new Error('Dual gate failed when both passed');
    });

    return results;
  }
}
