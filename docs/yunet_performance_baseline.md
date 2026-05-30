# YuNet Mobile Performance Baseline

This document outlines the expected performance metrics for the `face_detection_yunet_fp32.tflite` model (320×320 input shape) deployed via `react-native-fast-tflite` directly in a Vision Camera frame processor worklet.

## Asset Metadata
- **File:** `assets/models/face_detection_yunet_fp32.tflite`
- **Size:** ~231 KB
- **Parameters:** ~75,856
- **Architecture:** FP32 MobileNet FPN Anchor-Free Detector

## Android Performance Baseline

| Metric | Estimated Value | Notes |
|---|---|---|
| **Model Load Time** | < 15 ms | Negligible, load once at app startup |
| **RAM Footprint (Peak)** | 3 – 5 MB | Includes TFLite runtime overhead |
| **Inference Latency (CPU)** | 10 – 25 ms | Core-dependent (Snapdragon / Exynos) |
| **Inference Latency (NNAPI/GPU)** | 5 – 10 ms | Hardware acceleration (if supported) |
| **FPS Capacity** | 40 – 60+ FPS | Synchronous processing inside worklet won't block UI |
| **App Bundle Impact** | + 231 KB | Minimal impact on `.apk` size |

## iOS Performance Baseline

| Metric | Estimated Value | Notes |
|---|---|---|
| **Model Load Time** | < 10 ms | Load once at app startup |
| **RAM Footprint (Peak)** | 3 – 5 MB | |
| **Inference Latency (CPU)** | 8 – 15 ms | High single-core performance on Apple Silicon |
| **Inference Latency (CoreML)** | 3 – 8 ms | If converted to CoreML via Neural Engine |
| **FPS Capacity** | 60+ FPS | Easily sustains real-time processing |
| **App Bundle Impact** | + 231 KB | Minimal impact on `.ipa` size |

## Thermal and Battery Impact
Because the model has less than 100K parameters and operates on a heavily downscaled 320×320 image, the computational load per frame is extremely low.
- **Thermal:** No expected device heating, even during prolonged 60FPS continuous processing.
- **Battery:** Minimal drain. Inference consumes less power than the camera hardware itself.

## Future Optimization (Phase 5.x)
While the current FP32 model is exceptionally lightweight (~231 KB), it can be further optimized:
- **INT8 Post-Training Quantization (PTQ):** Reduces size to ~115 KB and improves latency on DSP/NPU units.
- **Dynamic Threading:** `react-native-fast-tflite` handles thread allocation natively, ensuring optimal core usage without manual threading logic.
