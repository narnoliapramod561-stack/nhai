import { CameraDevice } from 'react-native-vision-camera';
import { CameraPermissions } from './CameraPermissions';
import { CameraInitializationState, CameraPermissionState } from './CameraTypes';

export class CameraService {
  /**
   * Main initialization entry point.
   * Checks permissions and retrieves the front camera device.
   */
  static async initializeCamera(): Promise<CameraInitializationState> {
    try {
      const permission = await CameraPermissions.requestCameraPermission();
      if (permission !== CameraPermissionState.GRANTED) {
        return {
          isInitialized: false,
          hasDevice: false,
          permissionStatus: permission,
          error: 'Camera permission denied or blocked',
        };
      }

      // In VisionCamera v5, device list is reactive via useCameraDevices() hook.
      // For this initialization service, we just report success. 
      // The screen component handles device querying.
      return {
        isInitialized: true,
        hasDevice: true,
        permissionStatus: permission,
      };
    } catch (error) {
      return {
        isInitialized: false,
        hasDevice: false,
        permissionStatus: CameraPermissionState.DENIED,
        error: `Camera initialization failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Helper method to explicitly select the front-facing camera.
   */
  static getFrontCamera(devices: CameraDevice[]): CameraDevice | undefined {
    return devices.find((d) => d.position === 'front');
  }
}
