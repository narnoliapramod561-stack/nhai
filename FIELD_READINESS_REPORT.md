# Field Readiness Report

## Ready

- Android debug build and HomeScreen launch.
- Offline-first SQLite schema and queue table exist.
- Strict orchestrator state machine exists.
- Active/passive liveness architecture is defined.
- Fail-closed behavior for unavailable recognition/liveness models.

## Not Ready

- Real biometric verification cannot be production-ready without MobileFaceNet and MiniFASNet model assets.
- No real-world FAR/FRR calibration dataset is present.
- Enrollment cannot proceed until signature verification is implemented.
- Queue tamper/replay hardening is incomplete.

## Field Risks

- Sunlight and helmet shadows may break quality/preprocessing without calibrated CLAHE and exposure handling.
- Goggles, masks, helmets, and low-end camera sensors need field datasets.
- 24h offline operation needs soak testing for DB growth, battery, thermal throttling, and queue replay.
- Poor LTE sync needs backoff, idempotency keys, server acknowledgements, and queue integrity checks.

## Recommended Field Gate

Do not pilot beyond demo use until model assets, enrollment verification, row signing, and threshold calibration are complete.
