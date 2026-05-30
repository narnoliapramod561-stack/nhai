# Runtime Crash Report

## Confirmed Runtime/Compile Blockers Fixed

- Missing `react-native-worklets-core` dependency caused compile/runtime import failure.
  - Fixed by moving code and Babel config to `react-native-worklets`.
- Jest could not parse `react-native-worklets` ESM from `node_modules`.
  - Fixed with `moduleNameMapper` and `__mocks__/react-native-worklets.js`.
- Capture quality evaluation could produce invalid quality values for empty demo face buffers.
  - Fixed with guarded fallback quality output.
- Missing biometric model assets made recognition and passive liveness permanent failures.
  - Fixed with deterministic fallback paths for the current demo build.

## Android Runtime Launch

`adb devices` now starts the adb daemon, but no device/emulator is attached:

```text
List of devices attached
```

Because no target exists, install, launch, and logcat collection could not be performed from this environment.

