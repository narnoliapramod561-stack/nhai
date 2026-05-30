import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { BiometricCaptureScreen } from '../screens/BiometricCaptureScreen';
import { SuccessScreen } from '../screens/SuccessScreen';
import { OfflineQueueScreen } from '../screens/OfflineQueueScreen';
import { AuditScreen } from '../screens/AuditScreen';
import { DemoModeScreen } from '../screens/DemoModeScreen';

// Define the route params for the stack
export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  Success: { 
    employeeId: string;
    timestamp: string;
    score: number;
    queued: boolean;
  };
  OfflineQueue: undefined;
  Audit: undefined;
  DemoMode: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#FF9933' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'NHAI Attendance' }} 
        />
        <Stack.Screen 
          name="Capture" 
          component={BiometricCaptureScreen} 
          options={{ title: 'Verify Identity', headerShown: false }} 
        />
        <Stack.Screen 
          name="Success" 
          component={SuccessScreen} 
          options={{ title: 'Attendance Recorded', headerBackVisible: false }} 
        />
        <Stack.Screen 
          name="OfflineQueue" 
          component={OfflineQueueScreen} 
          options={{ title: 'Offline Sync Queue' }} 
        />
        <Stack.Screen 
          name="Audit" 
          component={AuditScreen} 
          options={{ title: 'Audit Log' }} 
        />
        <Stack.Screen 
          name="DemoMode" 
          component={DemoModeScreen} 
          options={{ title: 'Hackathon Demo Mode' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
