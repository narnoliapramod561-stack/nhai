import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FaceDetection, PerformanceMetrics } from './DetectionTypes';

interface DetectionOverlayProps {
  detections: FaceDetection[];
  metrics: PerformanceMetrics;
}

/**
 * Debug overlay for rendering raw bounding boxes and performance metrics.
 * Designed to be conditionally rendered only in DEV mode.
 */
export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ detections, metrics }) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Metrics Panel */}
      <View style={styles.metricsBox}>
        <Text style={styles.metricText}>Faces: {detections.length}</Text>
        <Text style={styles.metricText}>Infer: {metrics.inferenceTimeMs.toFixed(1)}ms</Text>
        <Text style={styles.metricText}>Avg: {metrics.averageInferenceTimeMs.toFixed(1)}ms</Text>
        <Text style={styles.metricText}>Peak: {metrics.peakInferenceMs.toFixed(1)}ms</Text>
        <Text style={styles.metricText}>FPS: {metrics.fps.toFixed(1)}</Text>
        <Text style={styles.metricText}>Mem: {metrics.memoryUsageEstimateMBps.toFixed(1)} MB/s</Text>
        <Text style={[
          styles.metricText, 
          metrics.thermalRiskLevel === 'HIGH' ? {color: 'red'} : 
          metrics.thermalRiskLevel === 'MEDIUM' ? {color: 'orange'} : {}
        ]}>
          Thermal: {metrics.thermalRiskLevel}
        </Text>
      </View>

      {/* Bounding Boxes */}
      {/* 
        Note: The detection coordinates are relative to the 320x320 input tensor.
        To draw them correctly over the screen, they would need to be scaled by:
        scaleX = screenWidth / 320
        scaleY = screenHeight / 320
        For this foundation phase, we'll just log them in the UI if needed,
        but rendering exact rects requires layout measurements which are skipped here.
      */}
      {detections.map((det, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: 20,
            top: 150 + index * 30,
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: 4,
            borderRadius: 4,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12 }}>
            Face {index + 1}: {det.bbox.w.toFixed(0)}x{det.bbox.h.toFixed(0)} 
            (Conf: {det.confidence.toFixed(2)}) 
            {det.isCentered ? ' [CENTERED]' : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  metricsBox: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
  },
  metricText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
