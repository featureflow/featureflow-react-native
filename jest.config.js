module.exports = {
  // Use ts-jest for TypeScript
  preset: 'ts-jest',
  
  // Use Node environment (not react-native)
  testEnvironment: 'node',
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test file patterns
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  
  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }]
  },
  
  // Don't transform node_modules
  transformIgnorePatterns: [
    'node_modules/'
  ],
  
  // Mock AsyncStorage
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js'
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/__tests__/**'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Root directory
  roots: ['<rootDir>/src']
};
