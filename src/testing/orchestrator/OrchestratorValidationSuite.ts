import { ValidationSuite, ValidationResult } from '../ValidationTypes';
import { AttendanceOrchestrator } from '../../orchestrator/AttendanceOrchestrator';
import { AttendanceState } from '../../orchestrator/AttendanceOrchestratorTypes';

export class OrchestratorValidationSuite implements ValidationSuite {
  name = 'Orchestrator Validation Suite';

  async run(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const runTest = async (testId: string, fn: () => Promise<void>) => {
      const start = Date.now();
      try {
        await fn();
        results.push({ testId, category: 'Orchestrator', status: 'PASS', executionMs: Date.now() - start, details: 'State machine verified' });
      } catch (e: any) {
        results.push({ testId, category: 'Orchestrator', status: 'FAIL', executionMs: Date.now() - start, details: e.message });
      }
    };

    await runTest('orch_state_skipping', async () => {
      // Create an orchestrator with dummy dependencies
      const orchestrator = new AttendanceOrchestrator({
        dualLivenessController: {
          evaluatePassive: () => ({ isLive: true, confidence: 0.99 }),
          decide: () => ({ active: {} as any, passive: {} as any, passed: true })
        } as any,
        verificationTransactionService: { queueTransaction: async () => 'txn-123' } as any,
        offlineQueueService: {} as any,
        extractEmbedding: () => ({ embedding: { vector: new Float32Array(192).fill(0.1) }, inferenceTimeMs: 10, success: true })
      });

      const mockFrames: any[] = [{ face: { buffer: new Float32Array(0), width: 112, height: 112 }, landmarks: {} as any, bbox: {} as any, width: 112, height: 112 }];
      const mockActive = { smilePassed: true, leftTurnPassed: true, rightTurnPassed: true, passed: true };

      const result = await orchestrator.executeVerification(
        'EMP-123',
        new Float32Array(192).fill(0.1),
        '1.0',
        mockFrames,
        mockActive,
        0, 0
      );

      if (!result.success) throw new Error(`Orchestrator failed: ${result.failureReason}`);
      
      const trail = orchestrator.getAuditTrail();
      // Ensure it hit all states in order
      const requiredStates = [
        AttendanceState.IDLE,
        AttendanceState.QUALITY_CHECK,
        AttendanceState.LIVENESS_CHECK,
        AttendanceState.EMBEDDING_EXTRACTION,
        AttendanceState.EMBEDDING_FUSION,
        AttendanceState.MATCHING,
        AttendanceState.TRANSACTION_CREATION,
        AttendanceState.QUEUEING,
        AttendanceState.SUCCESS
      ];

      const trailStates = trail.map(t => t.stateEntered);
      for (const req of requiredStates) {
        if (!trailStates.includes(req)) throw new Error(`Skipped mandatory state: ${req}`);
      }
    });

    await runTest('orch_failure_routing', async () => {
      const orchestrator = new AttendanceOrchestrator({
        dualLivenessController: {
          evaluatePassive: () => ({ isLive: false, confidence: 0.1 }), // Forces failure
          decide: () => ({ active: {} as any, passive: {} as any, passed: false })
        } as any,
        verificationTransactionService: {} as any,
        offlineQueueService: {} as any,
        extractEmbedding: () => ({ embedding: { vector: new Float32Array(192).fill(0.1) }, inferenceTimeMs: 10, success: true })
      });

      const result = await orchestrator.executeVerification(
        'EMP-123', new Float32Array(192), '1.0',
        [{ face: {} as any, landmarks: {} as any, bbox: {} as any, width: 112, height: 112 }],
        { smilePassed: true, leftTurnPassed: true, rightTurnPassed: true, passed: true },
        0, 0
      );

      if (result.success) throw new Error('Orchestrator passed on forced failure');
      if (orchestrator.getState() !== AttendanceState.FAILURE) throw new Error('Did not route to FAILURE state');
    });

    return results;
  }
}
