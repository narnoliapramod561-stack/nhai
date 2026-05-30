export type FrameOrientation = 'portrait' | 'landscape-right' | 'portrait-upside-down' | 'landscape-left';

export class OrientationService {
  /**
   * Maps physical device orientation to the Vision Camera resize plugin rotation format.
   * This ensures the tensor fed to YuNet is always perfectly upright.
   */
  static getRotationDegrees(orientation: FrameOrientation | string): '0deg' | '90deg' | '180deg' | '270deg' {
    'worklet';
    switch (orientation) {
      case 'portrait':
        return '0deg';
      case 'landscape-right':
        return '90deg'; // Usually requires 90deg CW rotation
      case 'portrait-upside-down':
        return '180deg';
      case 'landscape-left':
        return '270deg';
      default:
        return '0deg';
    }
  }
}
