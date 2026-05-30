import { LivenessState, LivenessStatus } from './LivenessTypes';

/**
 * Architectural State Machine for Liveness Challenges (Anti-Spoofing).
 * Does not implement ML detectors; purely orchestrates the flow.
 */
export class LivenessController {
  private currentState: LivenessState = LivenessState.CENTER_FACE;

  /**
   * Advances the state machine if the current challenge is passed.
   */
  public advanceState(): LivenessState {
    switch (this.currentState) {
      case LivenessState.CENTER_FACE:
        this.currentState = LivenessState.TURN_LEFT;
        break;
      case LivenessState.TURN_LEFT:
        this.currentState = LivenessState.TURN_RIGHT;
        break;
      case LivenessState.TURN_RIGHT:
        this.currentState = LivenessState.SMILE;
        break;
      case LivenessState.SMILE:
        this.currentState = LivenessState.PASSED;
        break;
      default:
        // Do nothing if already PASSED or FAILED
        break;
    }
    return this.currentState;
  }

  /**
   * Resets the liveness challenge.
   */
  public reset(): void {
    this.currentState = LivenessState.CENTER_FACE;
  }

  /**
   * Fails the challenge (e.g. timeout or spoof detected).
   */
  public fail(): void {
    this.currentState = LivenessState.FAILED;
  }

  /**
   * Returns the current state and corresponding UI prompt text.
   */
  public getStatus(): LivenessStatus {
    let promptText = '';
    
    switch (this.currentState) {
      case LivenessState.CENTER_FACE:
        promptText = 'Please center your face in the frame.';
        break;
      case LivenessState.TURN_LEFT:
        promptText = 'Slowly turn your head to the left.';
        break;
      case LivenessState.TURN_RIGHT:
        promptText = 'Slowly turn your head to the right.';
        break;
      case LivenessState.SMILE:
        promptText = 'Smile widely.';
        break;
      case LivenessState.PASSED:
        promptText = 'Liveness verified.';
        break;
      case LivenessState.FAILED:
        promptText = 'Liveness verification failed. Please try again.';
        break;
    }

    return {
      currentState: this.currentState,
      promptText
    };
  }
}
