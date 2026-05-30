import { AttendanceState } from './AttendanceOrchestratorTypes';

/**
 * Enforces rigorous state transitions for the attendance flow.
 * Prevents illegal state jumping (e.g. bypassing liveness).
 */
export class AttendanceOrchestratorStateMachine {
  private currentState: AttendanceState = AttendanceState.IDLE;

  /**
   * Defines the strictly allowed linear transitions.
   */
  private readonly validTransitions: Record<AttendanceState, AttendanceState[]> = {
    [AttendanceState.IDLE]: [AttendanceState.DETECTING_FACE],
    [AttendanceState.DETECTING_FACE]: [AttendanceState.QUALITY_CHECK, AttendanceState.FAILURE],
    [AttendanceState.QUALITY_CHECK]: [AttendanceState.LIVENESS_CHECK, AttendanceState.FAILURE],
    [AttendanceState.LIVENESS_CHECK]: [AttendanceState.EMBEDDING_EXTRACTION, AttendanceState.FAILURE],
    [AttendanceState.EMBEDDING_EXTRACTION]: [AttendanceState.EMBEDDING_FUSION, AttendanceState.FAILURE],
    [AttendanceState.EMBEDDING_FUSION]: [AttendanceState.MATCHING, AttendanceState.FAILURE],
    [AttendanceState.MATCHING]: [AttendanceState.TRANSACTION_CREATION, AttendanceState.FAILURE],
    [AttendanceState.TRANSACTION_CREATION]: [AttendanceState.QUEUEING, AttendanceState.FAILURE],
    [AttendanceState.QUEUEING]: [AttendanceState.SUCCESS, AttendanceState.FAILURE],
    [AttendanceState.SUCCESS]: [AttendanceState.IDLE],
    [AttendanceState.FAILURE]: [AttendanceState.IDLE],
  };

  public getState(): AttendanceState {
    return this.currentState;
  }

  /**
   * Attempts to transition to the requested state.
   * Throws an error if the transition is architecturally illegal.
   */
  public transition(nextState: AttendanceState): void {
    const allowed = this.validTransitions[this.currentState];
    if (!allowed || !allowed.includes(nextState)) {
      throw new Error(`Illegal state transition from ${this.currentState} to ${nextState}`);
    }
    this.currentState = nextState;
  }

  /**
   * Hard reset back to IDLE.
   */
  public reset(): void {
    this.currentState = AttendanceState.IDLE;
  }
}
