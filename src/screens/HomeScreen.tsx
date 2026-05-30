import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { globalStyles, NHAITheme } from '../theme/NHAITheme';
import { OfflineQueueService } from '../verification/OfflineQueueService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen = ({ navigation }: Props) => {
  const [pendingCount, setPendingCount] = useState(0);

  // We are creating a mock user for the Hackathon demo since enrollment is out of scope
  const mockUser = {
    name: 'Ramesh Kumar',
    id: 'EMP-9021',
    project: 'NH-44 Highway Extension',
    lastSync: '2 minutes ago',
  };

  useEffect(() => {
    // Poll the offline queue count for the dashboard
    const queueService = new OfflineQueueService();
    const interval = setInterval(async () => {
      try {
        const count = await queueService.getPendingQueueCount();
        setPendingCount(count);
      } catch (e) {
        // ignore in demo
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.paddedContainer}>
        
        <View style={globalStyles.card}>
          <Text style={NHAITheme.typography.title}>{mockUser.name}</Text>
          <Text style={NHAITheme.typography.body}>ID: {mockUser.id}</Text>
          <Text style={NHAITheme.typography.body}>Project: {mockUser.project}</Text>
          
          <View style={{ marginTop: 15, padding: 10, backgroundColor: NHAITheme.colors.surface, borderRadius: 8 }}>
            <Text style={NHAITheme.typography.caption}>Device Status: ONLINE (LTE)</Text>
            <Text style={NHAITheme.typography.caption}>Pending Sync: {pendingCount} records</Text>
            <Text style={NHAITheme.typography.caption}>Last Sync: {mockUser.lastSync}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={globalStyles.buttonPrimary} 
          onPress={() => navigation.navigate('Capture')}
        >
          <Text style={globalStyles.buttonTextPrimary}>Mark Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={globalStyles.buttonSecondary} 
          onPress={() => navigation.navigate('OfflineQueue')}
        >
          <Text style={globalStyles.buttonTextSecondary}>View Offline Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={globalStyles.buttonSecondary} 
          onPress={() => navigation.navigate('Audit')}
        >
          <Text style={globalStyles.buttonTextSecondary}>View Audit Log</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 40 }}>
          <Text style={[NHAITheme.typography.caption, { textAlign: 'center', marginBottom: 10 }]}>
            Judges Testing Area
          </Text>
          <TouchableOpacity 
            style={[globalStyles.buttonSecondary, { borderColor: NHAITheme.colors.error }]} 
            onPress={() => navigation.navigate('DemoMode')}
          >
            <Text style={[globalStyles.buttonTextSecondary, { color: NHAITheme.colors.error }]}>
              Enter Demo Mode
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
};
