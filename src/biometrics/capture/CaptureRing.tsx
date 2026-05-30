import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, AppState, AppStateStatus } from 'react-native';
import { CaptureState } from './CaptureState';

interface CaptureRingProps {
  state: CaptureState;
}

export const CaptureRing: React.FC<CaptureRingProps> = ({ state }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current; 
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // 1. Listen to AppState
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // 2. Manage animation lifecycle based on state and AppState
  useEffect(() => {
    // If the app goes to background, stop any existing animation and return.
    if (appState !== 'active') {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
      }
      return;
    }

    // App is active. Prevent duplicate loops by stopping the old one.
    if (pulseAnimRef.current) {
      pulseAnimRef.current.stop();
    }

    // 3. Create and start pulse animation
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: state === CaptureState.GREEN ? 1.05 : 1.02,
          duration: 800,
          useNativeDriver: true, // Fixed from audit to ensure GPU efficiency
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimRef.current.start();

    // 4. Clean up when component unmounts or dependencies change
    return () => {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
      }
    };
  }, [state, scaleAnim, appState]);

  useEffect(() => {
    // Color Transition
    let toValue = 0;
    if (state === CaptureState.YELLOW) toValue = 1;
    if (state === CaptureState.GREEN) toValue = 2;

    Animated.timing(colorAnim, {
      toValue,
      duration: 500,
      useNativeDriver: false, // Colors cannot use native driver
    }).start();
  }, [state, colorAnim]);

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['#FF3B30', '#FFCC00', '#34C759'], // RED, YELLOW, GREEN
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ringContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: borderColor,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    width: 280,
    height: 380,
    borderRadius: 140, // Oval/Face shape approximation
    borderWidth: 6,
    backgroundColor: 'transparent',
  },
});
