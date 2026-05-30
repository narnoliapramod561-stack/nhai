import { FaceQualityService } from '../biometrics/quality/FaceQualityService';
import { DualLivenessController } from '../biometrics/liveness/DualLivenessController';
import { EmbeddingFusionService } from '../biometrics/fusion/EmbeddingFusionService';
import { MatchingService } from '../biometrics/matching/MatchingService';
import { VerificationTransactionService } from '../verification/VerificationTransactionService';
import { OfflineQueueService } from '../verification/OfflineQueueService';
import { AttendanceOrchestratorStateMachine } from './AttendanceOrchestratorStateMachine';
import { AttendanceOrchestratorAudit } from './AttendanceOrchestratorAudit';
import { AttendanceState, AttendanceResult, AttendanceTimingMetrics } from './AttendanceOrchestratorTypes';
import { AlignedFace } from '../biometrics/preprocessing/PreprocessingTypes';
import { FaceLandmarks } from '../biometrics/detection/DetectionTypes';
import { AdaptiveThresholdPolicy } from '../biometrics/matching/AdaptiveThresholdPolicy';
import { MatchDecision } from '../biometrics/matching/MatchingTypes';
import { ActiveLivenessResult, LivenessFrame } from '../biometrics/liveness/active/ActiveLivenessTypes';
import { PassiveLivenessResult } from '../biometrics/liveness/passive/PassiveLivenessTypes';

/**
 * Dependency injection interfaces for the orchestrator.
 */
export interface OrchestratorDependencies {
  dualLivenessController: DualLivenessController;
  verificationTransactionService: VerificationTransactionService;
  offlineQueueService: OfflineQueueService;
  // Injected extract hook from RecognitionController
  extractEmbedding: (alignedFace: AlignedFace) => { embedding: { vector: Float32Array } | null; inferenceTimeMs: number; success: boolean };
}

/**
 * The Master Orchestrator for the entire offline attendance verification pipeline.
 *
 * Phase 10.2 upgrade: now requires DUAL-LAYER liveness (active + passive)
 * to pass before proceeding to embedding extraction.
 */
export class AttendanceOrchestrator {
  private stateMachine = new AttendanceOrchestratorStateMachine();
  private audit = new AttendanceOrchestratorAudit();

  // Timing state
  private metrics: AttendanceTimingMetrics = {
    detectionMs: 0,
    qualityMs: 0,
    livenessMs: 0,
    embeddingMs: 0,
    fusionMs: 0,
    matchingMs: 0,
    transactionMs: 0,
    queueMs: 0,
    totalMs: 0,
  };
  private executionStartMs: number = 0;

  constructor(private deps: OrchestratorDependencies) {}

  /**
   * Resets the orchestrator state for a new verification attempt.
   */
  public reset(): void {
    this.stateMachine.reset();
    this.audit.clear();
    this.deps.dualLivenessController.reset();
    this.metrics = {
      detectionMs: 0, qualityMs: 0, livenessMs: 0, embeddingMs: 0,
      fusionMs: 0, matchingMs: 0, transactionMs: 0, queueMs: 0, totalMs: 0,
    };
  }

  public getState(): AttendanceState {
    return this.stateMachine.getState();
  }

  public getAuditTrail() {
    return this.audit.dump();
  }

  /**
   * Executes a complete verification pipeline.
   *
   * @param employeeId        The worker's unique identifier.
   * @param storedEmbedding   Reference embedding from the identity cache.
   * @param embeddingVersion  Model version string for audit.
   * @param capturedFrames    Array of captured camera frames with landmarks.
   * @param activeLivenessResult  Pre-computed active liveness result from the UI challenge sequence.
   * @param latitude          GPS latitude.
   * @param longitude         GPS longitude.
   */
  public async executeVerification(
    employeeId: string,
    storedEmbedding: Float32Array,
    embeddingVersion: string,
    capturedFrames: { face: AlignedFace; landmarks: FaceLandmarks; bbox: any; width: number; height: number }[],
    activeLivenessResult: ActiveLivenessResult,
    latitude: number,
    longitude: number
  ): Promise<AttendanceResult> {
    this.executionStartMs = Date.now();
    let failureReason: string | undefined = undefined;
    let qualityScore = 0;
    let matchScore = 0;
    let transactionId: string | undefined = undefined;
    let queued = false;
    let livenessPassed = false;

    try {
      // --- 1. DETECTING_FACE ---
      this.transition(AttendanceState.DETECTING_FACE);
      const detectionStart = Date.now();
      if (!capturedFrames || capturedFrames.length === 0) {
        throw new Error('No face frames provided');
      }
      this.metrics.detectionMs = Date.now() - detectionStart;
      this.completeState(AttendanceState.DETECTING_FACE, true);

      // --- 2. QUALITY_CHECK ---
      this.transition(AttendanceState.QUALITY_CHECK);
      const qualityStart = Date.now();
      const bestFrame = capturedFrames[0];
      const quality = FaceQualityService.evaluate(
        bestFrame.face, bestFrame.landmarks, bestFrame.bbox, bestFrame.width, bestFrame.height
      );
      qualityScore = quality.overall;
      this.metrics.qualityMs = Date.now() - qualityStart;
      if (qualityScore < 70) {
        throw new Error(`Face quality too low: ${qualityScore}`);
      }
      this.completeState(AttendanceState.QUALITY_CHECK, true);

      // --- 3. LIVENESS_CHECK (DUAL LAYER) ---
      this.transition(AttendanceState.LIVENESS_CHECK);
      const livenessStart = Date.now();

      // Layer 1: Active liveness (blink + head turns) — already evaluated by the UI
      if (!activeLivenessResult.passed) {
        throw new Error('Active liveness check failed: blink or head-turn challenge not completed');
      }

      // Layer 2: Passive anti-spoof (MiniFASNet)
      const passiveResult: PassiveLivenessResult = this.deps.dualLivenessController.evaluatePassive(bestFrame.face);

      // Dual-layer AND gate
      const dualResult = this.deps.dualLivenessController.decide(activeLivenessResult, passiveResult);
      livenessPassed = dualResult.passed;

      this.metrics.livenessMs = Date.now() - livenessStart;
      if (!livenessPassed) {
        const reason = !passiveResult.isLive
          ? `Passive anti-spoof FAILED (spoofProbability: ${passiveResult.spoofProbability.toFixed(2)})`
          : 'Active liveness challenge incomplete';
        throw new Error(reason);
      }
      this.completeState(AttendanceState.LIVENESS_CHECK, true);

      // --- 4. EMBEDDING_EXTRACTION ---
      this.transition(AttendanceState.EMBEDDING_EXTRACTION);
      const extractionStart = Date.now();
      const rawEmbeddings: Float32Array[] = [];
      for (const frame of capturedFrames) {
        const result = this.deps.extractEmbedding(frame.face);
        if (result.success && result.embedding) {
          rawEmbeddings.push(result.embedding.vector);
        }
      }
      this.metrics.embeddingMs = Date.now() - extractionStart;
      if (rawEmbeddings.length === 0) {
        throw new Error('Embedding extraction failed for all frames');
      }
      this.completeState(AttendanceState.EMBEDDING_EXTRACTION, true);

      // --- 5. EMBEDDING_FUSION ---
      this.transition(AttendanceState.EMBEDDING_FUSION);
      const fusionStart = Date.now();
      const fusionResult = EmbeddingFusionService.fuse(rawEmbeddings);
      this.metrics.fusionMs = Date.now() - fusionStart;
      if (!fusionResult) {
        throw new Error('Embedding fusion failed (insufficient samples)');
      }
      this.completeState(AttendanceState.EMBEDDING_FUSION, true);

      // --- 6. MATCHING ---
      this.transition(AttendanceState.MATCHING);
      const matchStart = Date.now();
      const thresholdConfig = AdaptiveThresholdPolicy.getThresholds(qualityScore);
      const matchResult = MatchingService.evaluateMatch(storedEmbedding, fusionResult.embedding, thresholdConfig);
      matchScore = matchResult.score;
      this.metrics.matchingMs = Date.now() - matchStart;
      if (matchResult.decision === MatchDecision.FAIL || matchResult.decision === MatchDecision.RETRY) {
        throw new Error(`Match failed. Decision: ${matchResult.decision}`);
      }
      this.completeState(AttendanceState.MATCHING, true);

      // --- 7. TRANSACTION_CREATION & QUEUEING ---
      this.transition(AttendanceState.TRANSACTION_CREATION);
      const txStart = Date.now();
      const txnId = `txn_${Date.now()}`;
      transactionId = await this.deps.verificationTransactionService.queueTransaction({
        transactionId: txnId,
        employeeId,
        timestamp: new Date().toISOString(),
        latitude,
        longitude,
        matchScore,
        qualityScore,
        livenessPassed,
        embeddingVersion,
      });
      this.metrics.transactionMs = Date.now() - txStart;
      this.completeState(AttendanceState.TRANSACTION_CREATION, true);

      // Queueing happens atomically inside queueTransaction
      this.transition(AttendanceState.QUEUEING);
      queued = true;
      this.completeState(AttendanceState.QUEUEING, true);

      // --- SUCCESS ---
      this.transition(AttendanceState.SUCCESS);
      this.metrics.totalMs = Date.now() - this.executionStartMs;

      return {
        success: true,
        employeeId,
        matchScore,
        qualityScore,
        livenessPassed,
        transactionId,
        queued,
        executionTimeMs: this.metrics.totalMs,
      };
    } catch (error) {
      // --- FAILURE ---
      failureReason = (error as Error).message;
      this.audit.endState(this.getState(), false, failureReason);

      try {
        this.stateMachine.transition(AttendanceState.FAILURE);
      } catch (_e) {
        // Force to failure if transition rules broke
      }

      this.metrics.totalMs = Date.now() - this.executionStartMs;

      return {
        success: false,
        employeeId,
        matchScore,
        qualityScore,
        livenessPassed,
        transactionId,
        queued,
        failureReason,
        executionTimeMs: this.metrics.totalMs,
      };
    }
  }

  // --- Private Helpers ---

  private transition(nextState: AttendanceState) {
    this.stateMachine.transition(nextState);
    this.audit.startState(nextState);
  }

  private completeState(state: AttendanceState, success: boolean) {
    this.audit.endState(state, success);
  }
}
