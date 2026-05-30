import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { globalStyles, NHAITheme } from '../theme/NHAITheme';

export const DemoModeScreen = () => {
  return (
    <ScrollView style={globalStyles.container}>
      <View style={globalStyles.paddedContainer}>
        <Text style={[NHAITheme.typography.header, { marginBottom: 20 }]}>Hackathon Demo Harness</Text>
        <Text style={NHAITheme.typography.body}>
          Instructions for the Judges: Navigate to the Home screen and tap "Mark Attendance" to test the system against the following attack vectors.
        </Text>

        <View style={globalStyles.card}>
          <Text style={NHAITheme.typography.title}>1. Printed Photo Attack</Text>
          <Text style={NHAITheme.typography.body}>Hold a printed photo up to the camera.</Text>
          <Text style={[NHAITheme.typography.caption, { color: NHAITheme.colors.error, fontWeight: 'bold', marginTop: 5 }]}>
            Expected Outcome: REJECTED (Fails Active Smile + Passive Texture)
          </Text>
        </View>

        <View style={globalStyles.card}>
          <Text style={NHAITheme.typography.title}>2. Mobile Screen Replay</Text>
          <Text style={NHAITheme.typography.body}>Play a video of someone smiling and turning their head on an iPad/Phone.</Text>
          <Text style={[NHAITheme.typography.caption, { color: NHAITheme.colors.error, fontWeight: 'bold', marginTop: 5 }]}>
            Expected Outcome: REJECTED (MiniFASNet detects screen Moiré pattern)
          </Text>
        </View>

        <View style={globalStyles.card}>
          <Text style={NHAITheme.typography.title}>3. Real User</Text>
          <Text style={NHAITheme.typography.body}>A real human performing the active challenges.</Text>
          <Text style={[NHAITheme.typography.caption, { color: NHAITheme.colors.success, fontWeight: 'bold', marginTop: 5 }]}>
            Expected Outcome: ACCEPTED (Dual-Layer Liveness Passed)
          </Text>
        </View>

        <View style={globalStyles.card}>
          <Text style={NHAITheme.typography.title}>4. Offline Queue Sync</Text>
          <Text style={NHAITheme.typography.body}>Turn on Airplane Mode. Mark Attendance. Verify Queue Count increases. Turn off Airplane Mode. Queue syncs automatically.</Text>
          <Text style={[NHAITheme.typography.caption, { color: NHAITheme.colors.success, fontWeight: 'bold', marginTop: 5 }]}>
            Expected Outcome: No data loss during offline execution.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
