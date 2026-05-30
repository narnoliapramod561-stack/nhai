module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.js',
    '^react-native-nitro-modules$': '<rootDir>/__mocks__/react-native-nitro-modules.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@op-engineering|react-native-screens|react-native-safe-area-context)/)',
  ],
};
