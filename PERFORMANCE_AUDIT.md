# Performance Audit

## Measured Locally

- Clean build: successful.
- Incremental debug build after fixes: successful.
- Emulator launch to native activity displayed: approximately 3.4s after final restart.
- HomeScreen visible after JS bundle execution.

## Bottlenecks

- Debug startup is dominated by Metro bundling on first launch.
- YuNet preprocessing allocates a new Float32Array for each processed frame.
- Detection supports all four Android ABIs in debug, increasing native build time.
- TFLite native libraries and Nitro modules add startup load time.

## ML Pipeline Notes

- YuNet asset exists and bundles.
- MobileFaceNet and MiniFASNet assets are absent, so recognition/passive liveness fail closed.
- Embedding length guard enforces `192` when model output exists.

## Recommendations

- Add release-mode startup measurement with bundled JS.
- Pool/reuse frame input tensors where Worklets/TFLite constraints allow.
- Build only target ABI for local debug when iteration speed matters.
- Add timing emitters around each orchestrator phase to persist latency distributions.
