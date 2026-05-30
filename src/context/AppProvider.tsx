import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DatabaseService from '../database/DatabaseService';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  useEffect(() => {
    let mounted = true;

    const initializeDatabase = async () => {
      try {
        DatabaseService.open();
        await DatabaseService.runMigrations();
        await DatabaseService.getDB().execute(
          `INSERT OR IGNORE INTO Employee
            (employee_id, project_id, embedding_hash, embedding_version, last_sync_timestamp, last_used_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'EMP-9021',
            'NH-44 Highway Extension',
            'demo-offline-embedding',
            1,
            new Date().toISOString(),
            null,
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      } catch (error) {
        if (mounted) {
          console.error('Database initialization failed', error);
        }
      }
    };

    initializeDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaProvider>
      {/* Additional providers (Theme, Auth, Query, etc.) will go here */}
      {children}
    </SafeAreaProvider>
  );
};
