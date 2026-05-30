import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CaptureRing } from './CaptureRing';
import { useCaptureController } from './CaptureController';
import { CaptureState } from './CaptureState';
import { DetectionState } from '../detection/DetectionTypes';

interface CaptureOverlayProps {
  detectionState: DetectionState;
  isCentered: boolean;
}

export const CaptureOverlay: React.FC<CaptureOverlayProps> = ({ detectionState, isCentered }) => {
  const { currentState, message, captureReady } = useCaptureController(detectionState, isCentered);

  const getMessageColor = () => {
    switch (currentState) {
      case CaptureState.GREEN:
        return '#34C759';
      case CaptureState.YELLOW:
        return '#FFCC00';
      default:
        return '#FF3B30';
    }
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <View style={styles.centerContent}>
        <CaptureRing state={currentState} />
        
        <View style={styles.messageBox}>
          <Text style={[styles.messageText, { color: getMessageColor() }]}>
            {message}
          </Text>
        </View>
        
        {captureReady && (
          <View style={styles.captureIndicator}>
            <Text style={styles.captureText}>Capturing...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it floats above the camera
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBox: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
  },
  messageText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  captureIndicator: {
    position: 'absolute',
    bottom: -80,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  captureText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
