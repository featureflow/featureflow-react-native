import { FeatureflowClientImpl, createClient } from '../FeatureflowClient';
import { MemoryStorage } from '../storage';
import type { FeatureflowClient } from '../types';

// Mock fetch
global.fetch = jest.fn();

describe('FeatureflowClientImpl', () => {
  let storage: MemoryStorage;
  let clientsToCleanup: FeatureflowClient[] = [];

  beforeEach(() => {
    storage = new MemoryStorage();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    clientsToCleanup = [];
  });

  afterEach(() => {
    // Clean up any clients to prevent timer leaks
    clientsToCleanup.forEach(client => client.close());
  });

  // Helper to track clients for cleanup
  const trackClient = (client: FeatureflowClient): FeatureflowClient => {
    clientsToCleanup.push(client);
    return client;
  };

  describe('constructor', () => {
    it('should throw error if no API key provided', () => {
      expect(() => new FeatureflowClientImpl('', {}, storage)).toThrow(
        'Featureflow: API key is required'
      );
    });

    it('should create client with valid API key', () => {
      const client = trackClient(new FeatureflowClientImpl('test-api-key', {}, storage));
      expect(client).toBeDefined();
      expect(client.isInitialized()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize with provided user', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () =>
          Promise.resolve({
            'test-feature': 'on'
          })
      });

      const client = trackClient(new FeatureflowClientImpl('test-api-key', {}, storage));
      await client.initialize({ id: 'user-123' });

      expect(client.isInitialized()).toBe(true);
      expect(client.getUser().id).toBe('user-123');
    });

    it('should use default features in offline mode', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        {
          offline: true,
          defaultFeatures: {
            'test-feature': 'on',
            'another-feature': 'variant-a'
          }
        },
        storage
      ));

      await client.initialize({ id: 'user-123' });

      expect(client.isInitialized()).toBe(true);
      expect(client.evaluate('test-feature').isOn()).toBe(true);
      expect(client.evaluate('another-feature').value()).toBe('variant-a');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('evaluate', () => {
    it('should return off for unknown features', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        { offline: true },
        storage
      ));
      await client.initialize({ id: 'user-123' });

      const result = client.evaluate('unknown-feature');
      expect(result.isOff()).toBe(true);
      expect(result.value()).toBe('off');
    });

    it('should evaluate features correctly', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        {
          offline: true,
          defaultFeatures: {
            'feature-on': 'on',
            'feature-off': 'off',
            'feature-variant': 'blue'
          }
        },
        storage
      ));
      await client.initialize({ id: 'user-123' });

      expect(client.evaluate('feature-on').isOn()).toBe(true);
      expect(client.evaluate('feature-off').isOff()).toBe(true);
      expect(client.evaluate('feature-variant').is('blue')).toBe(true);
      expect(client.evaluate('feature-variant').is('red')).toBe(false);
    });
  });

  describe('getFeatures', () => {
    it('should return all evaluated features', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        {
          offline: true,
          defaultFeatures: {
            'feature-a': 'on',
            'feature-b': 'off'
          }
        },
        storage
      ));
      await client.initialize({ id: 'user-123' });

      const features = client.getFeatures();
      expect(features).toEqual({
        'feature-a': 'on',
        'feature-b': 'off'
      });
    });
  });

  describe('updateUser', () => {
    it('should update user context', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ 'feature': 'variant-a' })
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ 'feature': 'variant-b' })
        });

      const client = trackClient(new FeatureflowClientImpl('test-api-key', {}, storage));
      await client.initialize({ id: 'user-1' });
      expect(client.getUser().id).toBe('user-1');

      await client.updateUser({ id: 'user-2' });
      expect(client.getUser().id).toBe('user-2');
    });
  });

  describe('goal', () => {
    it('should not track goals in offline mode', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        { offline: true },
        storage
      ));
      await client.initialize({ id: 'user-123' });

      // Should not throw
      client.goal('purchase');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('createClient', () => {
    it('should create a client instance', () => {
      const client = trackClient(createClient('test-api-key', {}, storage));
      expect(client).toBeDefined();
    });
  });

  describe('events', () => {
    it('should emit and receive events', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        { offline: true },
        storage
      ));

      const callback = jest.fn();
      client.on('INIT', callback);

      await client.initialize({ id: 'user-123' });

      expect(callback).toHaveBeenCalled();
    });

    it('should unsubscribe from events', async () => {
      const client = trackClient(new FeatureflowClientImpl(
        'test-api-key',
        { offline: true },
        storage
      ));

      const callback = jest.fn();
      client.on('INIT', callback);
      client.off('INIT', callback);

      await client.initialize({ id: 'user-123' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('anonymous ID', () => {
    it('should generate and persist anonymous ID', async () => {
      const client = trackClient(new FeatureflowClientImpl('test-api-key', {}, storage));

      const id1 = await client.getAnonymousId();
      expect(id1).toMatch(/^anonymous:/);

      // Should return same ID on subsequent calls
      const id2 = await client.getAnonymousId();
      expect(id2).toBe(id1);
    });

    it('should reset anonymous ID', async () => {
      const client = trackClient(new FeatureflowClientImpl('test-api-key', {}, storage));

      const id1 = await client.getAnonymousId();
      const id2 = await client.resetAnonymousId();

      expect(id2).not.toBe(id1);
      expect(id2).toMatch(/^anonymous:/);
    });
  });
});

