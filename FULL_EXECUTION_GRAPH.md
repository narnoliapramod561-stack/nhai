# Full Execution Graph

## Primary Attendance Path

```text
HomeScreen
  -> navigation.navigate('Capture')
BiometricCaptureScreen
  -> CameraPermissions.requestCameraPermission()
  -> useCameraDevice('front')
  -> YuNetService.useYuNetDetection(onFrame)
  -> useDetectionController().onDetection(result)
  -> useAttendanceOrchestrator()
  -> processLivenessFrame(landmarks, timestampMs)
  -> startVerification(employeeId, storedEmbedding, frames, activeLiveness, gps)
AttendanceOrchestrator
  -> DETECTING_FACE
  -> QUALITY_CHECK
  -> LIVENESS_CHECK
  -> EMBEDDING_EXTRACTION
  -> EMBEDDING_FUSION
  -> MATCHING
  -> TRANSACTION_CREATION
  -> QUEUEING
  -> SUCCESS
SuccessScreen
```

## Dependency Map

```text
Home
↓
Capture
↓
AttendanceOrchestratorController
↓
AttendanceOrchestrator
↓
Detection: YuNetService -> DetectionDecoder -> DetectionController
↓
Quality: FaceQualityService
↓
Liveness: DualLivenessController -> ActiveLivenessController + PassiveLivenessController
↓
Embedding: RecognitionController -> MobileFaceNetService
↓
Fusion: EmbeddingFusionService
↓
Matching: MatchingService -> SimilarityEngine -> ThresholdPolicy
↓
Transaction: VerificationTransactionService
↓
SQLite: DatabaseService -> Attendance table
↓
Queue: SyncQueue table / OfflineQueueService / SyncQueueRepository
↓
Success
```

## Supporting Paths

- `AppProvider` opens SQLite, runs migrations, enables foreign keys, and seeds the demo employee used by `BiometricCaptureScreen`.
- `OfflineQueueScreen` reads queue state through `OfflineQueueService` and `SyncQueueRepository`.
- `RootNavigator` owns `Home`, `Capture`, `Success`, `OfflineQueue`, `Audit`, and `DemoMode` routes.
- Android native packaging includes VisionCamera, VisionCameraWorklets, Worklets, Fast TFLite, Nitro modules, and OP SQLite.

