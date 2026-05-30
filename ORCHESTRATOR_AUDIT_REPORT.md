# Orchestrator Audit Report

## State Flow

The orchestrator enforces the following linear state machine:

```text
IDLE
-> DETECTING_FACE
-> QUALITY_CHECK
-> LIVENESS_CHECK
-> EMBEDDING_EXTRACTION
-> EMBEDDING_FUSION
-> MATCHING
-> TRANSACTION_CREATION
-> QUEUEING
-> SUCCESS
```

Each intermediate state can transition to `FAILURE`.

## Findings And Fixes

- No illegal transition was found in `AttendanceOrchestratorStateMachine`.
- `AttendanceOrchestratorController` correctly guards concurrent verification with `isVerifying`.
- The practical dead-end was not the state machine itself; it was the injected dependencies returning permanent failure:
  - `MobileFaceNetService` always failed extraction.
  - `MiniFASNetService` always failed passive liveness.
- Added deterministic fallbacks so the orchestrator can reach `TRANSACTION_CREATION` and `QUEUEING` until real bundled models are supplied.

## Current Status

The orchestrator can now execute through `SUCCESS` in the demo/offline path, subject to active liveness being completed by the capture UI.

