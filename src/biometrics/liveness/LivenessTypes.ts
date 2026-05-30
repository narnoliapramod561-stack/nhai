export enum LivenessState {
  /** Initial state, waiting for the user to center their face. */
  CENTER_FACE = 'CENTER_FACE',
  /** Prompt user to turn head left. */
  TURN_LEFT = 'TURN_LEFT',
  /** Prompt user to turn head right. */
  TURN_RIGHT = 'TURN_RIGHT',
  /** Prompt user to smile. */
  SMILE = 'SMILE',
  /** Liveness challenge successfully completed. */
  PASSED = 'PASSED',
  /** Liveness challenge failed or timed out. */
  FAILED = 'FAILED'
}

export interface LivenessStatus {
  currentState: LivenessState;
  promptText: string;
}
