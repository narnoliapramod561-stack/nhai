import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { globalStyles, NHAITheme } from '../theme/NHAITheme';
import { OfflineQueueService } from '../verification/OfflineQueueService';

export const OfflineQueueScreen = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const queueService = new OfflineQueueService();
    const fetchQueue = async () => {
      try {
        const pending = await queueService.getPendingQueueCount();
        setCount(pending);
      } catch (e) {
        setCount(0);
      }
    };
    fetchQueue();
  }, []);

  return (
    <View style={globalStyles.paddedContainer}>
      <View style={[globalStyles.card, { backgroundColor: NHAITheme.colors.surface }]}>
        <Text style={[NHAITheme.typography.title, { color: NHAITheme.colors.primary }]}>
          Offline Synchronization
        </Text>
        <Text style={[NHAITheme.typography.body, { marginTop: 10 }]}>
          Works without internet. Records are safely stored in the local SQLite database and will automatically sync when LTE is restored.
        </Text>
      </View>

      <View style={[globalStyles.card, { alignItems: 'center', padding: 40 }]}>
        {count === null ? (
          <ActivityIndicator size="large" color={NHAITheme.colors.primary} />
        ) : (
          <>
            <Text style={{ fontSize: 64, fontWeight: 'bold', color: NHAITheme.colors.textPrimary }}>
              {count}
            </Text>
            <Text style={NHAITheme.typography.title}>Pending Sync</Text>
          </>
        )}
      </View>
      
      <Text style={[NHAITheme.typography.caption, { textAlign: 'center', marginTop: 20 }]}>
        Service: OfflineQueueService{'\n'}
        Strategy: Exponential Backoff
      </Text>
    </View>
  );
};
