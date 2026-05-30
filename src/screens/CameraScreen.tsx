import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, AppState } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { CameraPermissions, CameraPermissionState } from '../biometrics/camera';
import { CaptureOverlay } from '../biometrics/capture/CaptureOverlay';
import { YuNetService } from '../biometrics/detection/YuNetService';
import { useDetectionController } from '../biometrics/detection/DetectionController';
import { DetectionOverlay } from '../biometrics/detection/DetectionOverlay';

export const CameraScreen = () => {
  const [permissionState, setPermissionState] = useState<CameraPermissionState>(
    CameraPermissions.getCameraPermissionStatus()
  );
  
  const [isActive, setIsActive] = useState(true);

  // Custom hook from vision-camera to grab the front device reactively
  const device = useCameraDevice('front');

  // YuNet Detection Logic
  const detectionController = useDetectionController();
  const { modelLoaded, modelError, frameOutput } = YuNetService.useYuNetDetection(
    detectionController.onDetection
  );

  useEffect(() => {
    const checkPermissions = async () => {
      const status = await CameraPermissions.requestCameraPermission();
      setPermissionState(status);
    };
    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      setIsActive(nextAppState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (permissionState === CameraPermissionState.NOT_DETERMINED) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>Requesting camera access...</Text>
      </View>
    );
  }

  if (permissionState !== CameraPermissionState.GRANTED) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Camera permission is {permissionState.toLowerCase()}.
        </Text>
        <Text style={styles.text}>Please enable camera access in your device settings to continue.</Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>CAMERA_UNAVAILABLE: Front camera not found or initializing.</Text>
      </View>
    );
  }

  if (!modelLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#34C759" />
        <Text style={styles.text}>Loading face detection models...</Text>
        {modelError && <Text style={styles.errorText}>Error: {modelError.message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        outputs={[frameOutput]}
      />
      
      {/* Animated guide ring based on detection state */}
      <CaptureOverlay 
        detectionState={detectionController.detectionState}
        isCentered={detectionController.isCentered}
      />

      {/* Debug overlay (Only visible in DEV, disabled by default, enabled by uncommenting here) */}
      {/* __DEV__ && (
        <DetectionOverlay 
          detections={detectionController.faceCount > 0 ? [detectionController.largestFace!] : []} 
          metrics={detectionController.performanceMetrics} 
        />
      ) */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});
