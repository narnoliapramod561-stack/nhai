import { AttendanceState } from './AttendanceOrchestratorTypes';

export interface AttendanceAuditRecord {
  stateEntered: AttendanceState;
  stateExited: AttendanceState | null;
  durationMs: number;
  success: boolean;
  timestamp: string;
  errorMessage?: string;
}

/**
 * Provides granular traceability for every verification attempt.
 */
export class AttendanceOrchestratorAudit {
  private records: AttendanceAuditRecord[] = [];
  private currentStateStart: number = 0;

  public startState(state: AttendanceState): void {
    this.currentStateStart = Date.now();
    this.records.push({
      stateEntered: state,
      stateExited: null,
      durationMs: 0,
      success: false,
      timestamp: new Date().toISOString(),
    });
  }

  public endState(state: AttendanceState, success: boolean, errorMessage?: string): void {
    const record = this.records[this.records.length - 1];
    if (record && record.stateEntered === state) {
      record.stateExited = state;
      record.durationMs = Date.now() - this.currentStateStart;
      record.success = success;
      record.errorMessage = errorMessage;
    }
  }

  public dump(): AttendanceAuditRecord[] {
    return [...this.records];
  }

  public clear(): void {
    this.records = [];
  }
}
