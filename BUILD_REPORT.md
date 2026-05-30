# Build Report

## Result

- `./gradlew clean`: BUILD SUCCESSFUL
- `./gradlew assembleDebug`: BUILD SUCCESSFUL
- Final APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Fixes Applied

- Replaced obsolete `db.executeAsync(...)` calls with installed op-sqlite `db.execute(...)`.
- Added SQLite startup initialization and migrations in `AppProvider`.
- Fixed typed row access for op-sqlite 16, whose `rows` is an array.
- Added Jest transform config and native-module mocks for smoke testing.
- Removed static requires for missing `minifasnet.tflite` and `mobilefacenet_fp16.tflite`; those services now fail closed instead of crashing Metro at startup.

## Remaining Build Warnings

- Third-party native warnings from VisionCamera, Worklets, fast-tflite, quick-crypto, and op-sqlite.
- Gradle warns deprecated features will be incompatible with Gradle 10.

No build-blocking issues remain.
