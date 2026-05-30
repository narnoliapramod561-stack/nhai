export enum CameraPermissionState {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  BLOCKED = 'BLOCKED',
  NOT_DETERMINED = 'NOT_DETERMINED',
}

export interface CameraInitializationState {
  isInitialized: boolean;
  hasDevice: boolean;
  permissionStatus: CameraPermissionState;
  error?: string;
}
