# Runtime Report

## Validation Performed

- Installed debug APK on emulator `emulator-5554`.
- Reversed Metro port `8081`.
- Launched `com.nhaiapp/.MainActivity`.
- Confirmed running process: `com.nhaiapp`.
- Captured HomeScreen screenshot after bundle load.
- Checked logcat for fatal native exceptions and JS red-screen errors after the final launch.

## Result

The app launches and reaches HomeScreen without a fatal native crash or visible red screen.

## Runtime Fixes

- Startup SQLite migration was missing; fixed in `AppProvider`.
- Runtime red screen from missing passive liveness model was fixed by failing closed when `minifasnet.tflite` is absent.
- The same missing-asset issue was fixed for `mobilefacenet_fp16.tflite`.

## Observations

- First launch waits for Metro bundling in debug mode.
- React Native logged a non-fatal Bridgeless soft exception during early window focus before context readiness.
- HomeScreen queue count resolves to `0` after database initialization.
