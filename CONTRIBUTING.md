# Contributing to @featureflow/react-native-sdk

Thank you for your interest in contributing to the Featureflow React Native SDK!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/featureflow/featureflow-react-native.git
   cd featureflow-react-native
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the SDK:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Project Structure

```
src/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript type definitions
├── FeatureflowClient.ts        # Core client implementation
├── RestClient.ts               # HTTP client for API calls
├── FeatureflowProvider.tsx     # React provider component
├── FeatureflowProviderWithClient.tsx
├── context.ts                  # React context
├── events.ts                   # Event constants
├── evaluate.ts                 # Feature evaluation logic
├── conditions.ts               # Condition testing utilities
├── storage.ts                  # AsyncStorage adapter
└── hooks/
    ├── index.ts
    ├── useFeatureflow.ts
    ├── useFeatures.ts
    ├── useBooleanFlag.ts
    ├── useStringFlag.ts
    └── useFeatureflowStatus.ts
```

## Code Style

- Use TypeScript for all source files
- Follow the existing code style
- Add JSDoc comments for public APIs
- Write tests for new features

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run type checking (`npm run typecheck`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Reporting Issues

When reporting issues, please include:
- SDK version
- React Native version
- Platform (iOS/Android)
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

