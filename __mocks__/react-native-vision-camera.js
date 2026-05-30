const React = require('react');
const { View } = require('react-native');

const Camera = React.forwardRef((props, ref) => (
  React.createElement(View, { ...props, ref })
));

Camera.requestCameraPermission = jest.fn(async () => 'granted');
Camera.getCameraPermissionStatus = jest.fn(async () => 'granted');

module.exports = {
  Camera,
  VisionCamera: {
    requestCameraPermission: jest.fn(async () => 'granted'),
    getCameraPermissionStatus: jest.fn(async () => 'granted'),
  },
  useCameraDevice: jest.fn(() => ({ id: 'mock-camera', position: 'front' })),
  useFrameOutput: jest.fn(() => null),
};
