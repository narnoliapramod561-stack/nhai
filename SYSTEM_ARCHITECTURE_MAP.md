# System Architecture Map

## Verified Stack

- React Native: 0.85.3
- React: 19.2.3
- Android Gradle Plugin: resolved by React Native 0.85 Gradle plugin
- Gradle wrapper: 9.3.1
- Kotlin: 2.1.20
- Android SDK: compile/target 36, min 24
- VisionCamera: react-native-vision-camera 5.0.11
- Worklets: react-native-worklets-core 1.6.3
- TFLite: react-native-fast-tflite 3.0.1
- SQLite: @op-engineering/op-sqlite 16.2.0
- Navigation: @react-navigation/native 7.2.5, native-stack 7.16.0
- Security: react-native-quick-crypto AES-256-GCM plus react-native-keychain secure storage

## Major Subsystems

- App shell: `App.tsx`, `src/context/AppProvider.tsx`, `src/navigation/RootNavigator.tsx`
- Screens: Home, capture, success, offline queue, audit, demo mode
- Camera: VisionCamera wrappers under `src/biometrics/camera`
- Detection: YuNet TFLite loading, frame resize, throttling, decode, NMS
- Preprocessing: orientation, face alignment, contrast enhancement
- Recognition: MobileFaceNet service and embedding normalization utilities
- Matching: cosine similarity, fixed/adaptive threshold policy
- Liveness: active challenge controller, smile/head-pose services, passive MiniFASNet policy, dual AND gate
- Orchestrator: strict state machine, audit trail, transaction and queue wiring
- SQLite: op-sqlite service, initial schema, repositories for Employee/Attendance/SyncQueue
- Identity: encrypted embedding cache, LRU helpers
- Sync: enrollment package validation, sync payload contracts/builders, offline queue
- Security: AES-GCM encryption, Keychain-backed master key lifecycle, enrollment signature placeholder
- Validation: suite classes under `src/testing`, plus Jest app smoke test

## Dependency Flow

Camera frame -> YuNet detection -> quality check -> active/passive liveness -> MobileFaceNet embedding -> fusion -> matching -> SQLite attendance transaction -> SyncQueue -> later Datalake payload.

The runtime app now initializes SQLite migrations from `AppProvider` before screens attempt queue/audit reads.
