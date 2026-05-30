import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

import { CameraPermissions, CameraPermissionState } from '../biometrics/camera';
import { YuNetService } from '../biometrics/detection/YuNetService';
import { useDetectionController } from '../biometrics/detection/DetectionController';
import { CaptureOverlay } from '../biometrics/capture/CaptureOverlay';
import { useAttendanceOrchestrator } from '../orchestrator/AttendanceOrchestratorController';
import { AttendanceState } from '../orchestrator/AttendanceOrchestratorTypes';
import { ActiveLivenessResult } from '../biometrics/liveness/active/ActiveLivenessTypes';

import { globalStyles, NHAITheme } from '../theme/NHAITheme';

// Mock Embedded User for Demo (Since we aren't building enrollment)
const MOCK_EMPLOYEE_ID = 'EMP-9021';
const MOCK_EMBEDDING = new Float32Array(192).fill(0.1); // Dummy embedding, Matching will likely fail or pass depending on threshold test

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export const BiometricCaptureScreen = ({ navigation }: Props) => {
  const [permission, setPermission] = useState(CameraPermissionState.NOT_DETERMINED);
  const device = useCameraDevice('front');

  // Controllers
  const detectionController = useDetectionController();
  const orchestrator = useAttendanceOrchestrator();

  // State
  const [livenessResult, setLivenessResult] = useState<ActiveLivenessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Frame Buffer for Verification
  const frameBuffer = useRef<any[]>([]);
  const isExecuting = useRef(false);

  // Initialize Camera
  useEffect(() => {
    CameraPermissions.requestCameraPermission().then(setPermission);
  }, []);

  // Frame processor callback
  const onFrame = (result: any) => {
    detectionController.onDetection(result);

    if (isExecuting.current || orchestrator.isVerifying) return;

    if (detectionController.isCentered && detectionController.largestFace) {
      const face = detectionController.largestFace;
      const ts = Date.now();

      // Collect frames
      frameBuffer.current.push({
        face: { buffer: new Float32Array(0), width: 112, height: 112 }, // mock AlignedFace buffer
        landmarks: face.landmarks,
        bbox: face.bbox,
        width: 112,
        height: 112,
      });
      if (frameBuffer.current.length > 5) frameBuffer.current.shift();

      // Process Liveness
      const result = orchestrator.processLivenessFrame({
        landmarks: face.landmarks,
        timestampMs: ts,
      });

      setLivenessResult(result);

      if (result.passed) {
        isExecuting.current = true;
        executeVerification(result);
      }
    }
  };

  const { modelLoaded, frameOutput } = YuNetService.useYuNetDetection(onFrame);

  const executeVerification = async (activeResult: ActiveLivenessResult) => {
    try {
      const result = await orchestrator.startVerification(
        MOCK_EMPLOYEE_ID,
        MOCK_EMBEDDING,
        '1.0',
        frameBuffer.current,
        activeResult,
        28.7041, // Mock GPS Lat
        77.1025  // Mock GPS Lon
      );

      if (result.success) {
        navigation.replace('Success', {
          employeeId: MOCK_EMPLOYEE_ID,
          timestamp: new Date().toISOString(),
          score: result.matchScore || 0,
          queued: result.queued,
        });
      } else {
        setErrorMsg(result.failureReason || 'Verification Failed');
        isExecuting.current = false;
        frameBuffer.current = [];
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      isExecuting.current = false;
      frameBuffer.current = [];
    }
  };

  // UI Helpers
  const getLivenessPrompt = () => {
    if (!detectionController.isCentered) return 'Center your face';
    if (!livenessResult) return 'Detecting...';
    if (!livenessResult.leftTurnPassed) return 'Turn Left';
    if (!livenessResult.rightTurnPassed) return 'Turn Right';
    if (!livenessResult.smilePassed) return 'Smile';
    return 'Liveness Passed';
  };

  if (permission !== CameraPermissionState.GRANTED || !device || !modelLoaded) {
    return (
      <View style={globalStyles.center}>
        <ActivityIndicator size="large" color={NHAITheme.colors.primary} />
        <Text style={NHAITheme.typography.body}>Initializing Camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!isExecuting.current} // Pause camera when verifying
        outputs={[frameOutput]}
      />

      {/* Capture Ring */}
      <CaptureOverlay 
        detectionState={detectionController.detectionState}
        isCentered={detectionController.isCentered}
      />

      {/* Top Banner: Liveness Progress UI */}
      <View style={styles.topBanner}>
        <Text style={styles.promptText}>{getLivenessPrompt()}</Text>
        <View style={styles.stepsContainer}>
          <View style={[styles.stepDot, livenessResult?.leftTurnPassed && styles.stepPassed]} />
          <View style={[styles.stepDot, livenessResult?.rightTurnPassed && styles.stepPassed]} />
          <View style={[styles.stepDot, livenessResult?.smilePassed && styles.stepPassed]} />
        </View>
      </View>

      {/* Bottom Banner: Orchestrator State / ML Visibility */}
      <View style={styles.bottomBanner}>
        {orchestrator.isVerifying ? (
          <View style={styles.verifyBox}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.stateText}>{orchestrator.orchestratorState}</Text>
            {orchestrator.orchestratorState === AttendanceState.LIVENESS_CHECK && (
              <Text style={styles.subStateText}>Passive Anti-Spoof (MiniFASNet)</Text>
            )}
            {orchestrator.orchestratorState === AttendanceState.MATCHING && (
              <Text style={styles.subStateText}>Extracting 192-d MobileFaceNet Vector</Text>
            )}
          </View>
        ) : (
          <Text style={styles.subStateText}>Real-Time Detection Active</Text>
        )}

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)} style={{marginTop: 5}}>
              <Text style={{color: '#fff', textDecorationLine: 'underline'}}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.cancelBtn} 
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  topBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  promptText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  stepDot: {
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
  },
  stepPassed: {
    backgroundColor: NHAITheme.colors.success,
  },
  bottomBanner: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  verifyBox: {
    backgroundColor: 'rgba(255, 153, 51, 0.9)', // NHAI Orange
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  stateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  subStateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  errorText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  }
});
