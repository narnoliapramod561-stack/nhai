import { VisionCamera } from 'react-native-vision-camera';
import { CameraPermissionState } from './CameraTypes';

export class CameraPermissions {
  /**
   * Retrieves the current camera permission status.
   */
  static getCameraPermissionStatus(): CameraPermissionState {
    const status = VisionCamera.cameraPermissionStatus;
    switch (status) {
      case 'authorized':
        return CameraPermissionState.GRANTED;
      case 'denied':
        return CameraPermissionState.DENIED;
      case 'restricted':
        return CameraPermissionState.BLOCKED;
      default:
        return CameraPermissionState.NOT_DETERMINED;
    }
  }

  /**
   * Requests camera permission from the user.
   */
  static async requestCameraPermission(): Promise<CameraPermissionState> {
    const isGranted = await VisionCamera.requestCameraPermission();
    if (isGranted) return CameraPermissionState.GRANTED;
    
    // Fallback to checking exact status if not granted
    return this.getCameraPermissionStatus();
  }
}
