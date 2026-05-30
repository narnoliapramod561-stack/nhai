import { StyleSheet } from 'react-native';

/**
 * NHAI Hackathon Theme
 * Designed for high visibility outdoors (construction sites).
 */
export const NHAITheme = {
  colors: {
    primary: '#FF9933', // Saffron / Orange
    background: '#FFFFFF',
    surface: '#F5F5F5',
    textPrimary: '#333333', // Dark Gray
    textSecondary: '#666666',
    success: '#34C759', // Green
    warning: '#FFCC00', // Yellow
    error: '#FF3B30',   // Red
    border: '#E0E0E0',
  },
  typography: {
    header: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      color: '#333333',
    },
    title: {
      fontSize: 22,
      fontWeight: '600' as const,
      color: '#333333',
    },
    body: {
      fontSize: 18,
      color: '#333333',
    },
    caption: {
      fontSize: 14,
      color: '#666666',
    },
  },
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NHAITheme.colors.background,
  },
  paddedContainer: {
    flex: 1,
    backgroundColor: NHAITheme.colors.background,
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: NHAITheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonSecondary: {
    backgroundColor: NHAITheme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: NHAITheme.colors.border,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: NHAITheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: NHAITheme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
