import { useState, useCallback, useMemo } from 'react';
import { DualLivenessController } from '../biometrics/liveness/DualLivenessController';
import { PassiveLivenessController } from '../biometrics/liveness/passive/PassiveLivenessController';
import { MiniFASNetService } from '../biometrics/liveness/passive/MiniFASNetService';
import { VerificationTransactionService } from '../verification/VerificationTransactionService';
import { OfflineQueueService } from '../verification/OfflineQueueService';
import { AttendanceOrchestrator } from './AttendanceOrchestrator';
import { useRecognitionController } from '../biometrics/recognition/RecognitionController';
import { AlignedFace } from '../biometrics/preprocessing/PreprocessingTypes';
import { FaceLandmarks } from '../biometrics/detection/DetectionTypes';
import { AttendanceResult, AttendanceState } from './AttendanceOrchestratorTypes';
import { ActiveLivenessResult, LivenessFrame } from '../biometrics/liveness/active/ActiveLivenessTypes';

/**
 * React Hook serving as the facade for the UI layer.
 * Instantiates all service layers and wires them into the Orchestrator
 * via strict Dependency Injection.
 *
 * Phase 10.2: Now wires in DualLivenessController (Active + Passive MiniFASNet).
 */
export const useAttendanceOrchestrator = () => {
  const [orchestratorState, setOrchestratorState] = useState<AttendanceState>(AttendanceState.IDLE);
  const [isVerifying, setIsVerifying] = useState(false);

  // Initialize ML hooks
  const { extract } = useRecognitionController();
  const { classify } = MiniFASNetService.useMiniFASNet();

  // Build the dual liveness stack via DI
  const orchestrator = useMemo(() => {
    const passiveController = new PassiveLivenessController(classify);
    const dualLivenessController = new DualLivenessController(passiveController);

    return new AttendanceOrchestrator({
      dualLivenessController,
      verificationTransactionService: new VerificationTransactionService(),
      offlineQueueService: new OfflineQueueService(),
      extractEmbedding: extract,
    });
  }, [extract, classify]);

  /**
   * Feeds a camera frame to the active liveness detector.
   * Call this continuously during the challenge UI phase.
   */
  const processLivenessFrame = useCallback(
    (frame: LivenessFrame) => {
      return orchestrator['deps'].dualLivenessController.processActiveFrame(frame);
    },
    [orchestrator]
  );

  /**
   * Primary entry point triggered by the UI to verify an employee's attendance.
   *
   * @param activeLivenessResult  The accumulated result from processLivenessFrame calls.
   */
  const startVerification = useCallback(
    async (
      employeeId: string,
      storedEmbedding: Float32Array,
      embeddingVersion: string,
      capturedFrames: { face: AlignedFace; landmarks: FaceLandmarks; bbox: any; width: number; height: number }[],
      activeLivenessResult: ActiveLivenessResult,
      latitude: number,
      longitude: number
    ): Promise<AttendanceResult> => {
      if (isVerifying) {
        throw new Error('Verification already in progress.');
      }

      setIsVerifying(true);
      orchestrator.reset();
      setOrchestratorState(orchestrator.getState());

      const result = await orchestrator.executeVerification(
        employeeId,
        storedEmbedding,
        embeddingVersion,
        capturedFrames,
        activeLivenessResult,
        latitude,
        longitude
      );

      setOrchestratorState(orchestrator.getState());
      setIsVerifying(false);

      return result;
    },
    [orchestrator, isVerifying]
  );

  return {
    startVerification,
    processLivenessFrame,
    orchestratorState,
    isVerifying,
    getAuditTrail: () => orchestrator.getAuditTrail(),
  };
};
