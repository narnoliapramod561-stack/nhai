# Architecture Audit

## P0 Findings

- Missing production biometric model assets: `mobilefacenet_fp16.tflite` and `minifasnet.tflite` are not bundled. The app now launches, but recognition and passive liveness fail closed until real models are supplied.
- Enrollment signature verification is intentionally unimplemented and fail-closed. No enrollment packages can be accepted in production until ECDSA verification is implemented.

## P1 Findings

- `AdaptiveThresholdPolicy` uses match thresholds `0.55-0.60`, materially lower than the fixed default `0.80`. This needs calibration on real NHAI data before field use.
- YuNet decoder assumes exact output tensor order and 12 tensors. This should be locked by model metadata or verified against every converted model artifact.
- `ClaheService` comments assume possible `[0,255]` input, while detection preprocessing normalizes RGB to `[0,1]`. Contrast behavior needs one canonical tensor range.
- `useAttendanceOrchestrator` accesses `orchestrator['deps']`, bypassing the class boundary.
- Queueing is atomic inside `VerificationTransactionService.queueTransaction`, but `OfflineQueueService.enqueue` can still be called separately and create split transaction/queue behavior.

## P2 Findings

- AppProvider logs database initialization failures but does not expose a user-visible degraded state.
- Detection allocates a new 320x320 Float32Array per processed frame; throttling helps, but this remains a GC hotspot.
- Liveness smile detection can be replayed by a high-quality video unless passive liveness is available.
- Validation suite classes exist but are not wired into an npm/CLI runner.

## State Machine

The orchestrator enforces:

`IDLE -> DETECTING_FACE -> QUALITY_CHECK -> LIVENESS_CHECK -> EMBEDDING_EXTRACTION -> EMBEDDING_FUSION -> MATCHING -> TRANSACTION_CREATION -> QUEUEING -> SUCCESS`

Illegal direct state skips throw. Failures route to `FAILURE`, then reset to `IDLE`.
