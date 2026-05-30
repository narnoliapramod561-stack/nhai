import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { globalStyles, NHAITheme } from '../theme/NHAITheme';
import DatabaseService from '../database/DatabaseService';

export const AuditScreen = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        // We use a raw query just for the audit display
        // The real app would use the Repository pattern, but this is a debug view.
        const db = DatabaseService.getDB();
        const result = await db.execute(
          'SELECT attendance_id, employee_id, timestamp, verification_score, status, sync_status FROM Attendance ORDER BY timestamp DESC LIMIT 20'
        );
        const items = result.rows || [];
        setRecords(items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={globalStyles.card}>
      <Text style={NHAITheme.typography.body}>ID: {item.employee_id}</Text>
      <Text style={NHAITheme.typography.caption}>Time: {new Date(item.timestamp).toLocaleString()}</Text>
      <Text style={NHAITheme.typography.caption}>Score: {item.verification_score?.toFixed(3) || 'N/A'}</Text>
      <Text style={[NHAITheme.typography.caption, { color: item.status === 'VERIFIED' ? NHAITheme.colors.success : NHAITheme.colors.error, fontWeight: 'bold' }]}>
        Status: {item.status}
      </Text>
      <Text style={NHAITheme.typography.caption}>Sync: {item.sync_status}</Text>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={NHAITheme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.attendance_id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={NHAITheme.typography.body}>No records found.</Text>}
        />
      )}
    </View>
  );
};
