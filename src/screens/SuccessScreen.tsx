import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { globalStyles, NHAITheme } from '../theme/NHAITheme';

type Props = NativeStackScreenProps<RootStackParamList, 'Success'>;

export const SuccessScreen = ({ route, navigation }: Props) => {
  const { employeeId, timestamp, score, queued } = route.params;

  return (
    <View style={globalStyles.paddedContainer}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ 
          width: 80, height: 80, borderRadius: 40, 
          backgroundColor: NHAITheme.colors.success, 
          justifyContent: 'center', alignItems: 'center',
          marginBottom: 20 
        }}>
          <Text style={{ fontSize: 40, color: '#fff' }}>✓</Text>
        </View>
        
        <Text style={NHAITheme.typography.header}>Attendance Recorded</Text>
        
        <View style={[globalStyles.card, { width: '100%', marginTop: 30 }]}>
          <Text style={NHAITheme.typography.body}>Employee: {employeeId}</Text>
          <Text style={NHAITheme.typography.caption}>Time: {new Date(timestamp).toLocaleString()}</Text>
          <Text style={NHAITheme.typography.caption}>Location: NH-44 Site Alpha</Text>
          
          <View style={{ height: 1, backgroundColor: NHAITheme.colors.border, marginVertical: 15 }} />
          
          <Text style={NHAITheme.typography.caption}>Match Score: {score.toFixed(3)}</Text>
          <Text style={[NHAITheme.typography.caption, { color: NHAITheme.colors.success, fontWeight: 'bold' }]}>
            Liveness: PASSED (Dual-Layer)
          </Text>
          <Text style={[NHAITheme.typography.caption, { color: queued ? NHAITheme.colors.warning : NHAITheme.colors.success }]}>
            Queue Status: {queued ? 'Pending Sync (Offline)' : 'Synced'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={globalStyles.buttonPrimary} 
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={globalStyles.buttonTextPrimary}>Return Home</Text>
      </TouchableOpacity>
    </View>
  );
};
