import { MemoryStorage } from '../storage';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('getItem', () => {
    it('should return null for non-existent keys', async () => {
      const value = await storage.getItem('non-existent');
      expect(value).toBeNull();
    });

    it('should return stored value', async () => {
      await storage.setItem('key', 'value');
      const value = await storage.getItem('key');
      expect(value).toBe('value');
    });
  });

  describe('setItem', () => {
    it('should store value', async () => {
      await storage.setItem('key', 'value');
      expect(await storage.getItem('key')).toBe('value');
    });

    it('should overwrite existing value', async () => {
      await storage.setItem('key', 'value1');
      await storage.setItem('key', 'value2');
      expect(await storage.getItem('key')).toBe('value2');
    });
  });

  describe('removeItem', () => {
    it('should remove stored value', async () => {
      await storage.setItem('key', 'value');
      await storage.removeItem('key');
      expect(await storage.getItem('key')).toBeNull();
    });

    it('should not throw for non-existent keys', async () => {
      await expect(storage.removeItem('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all stored values', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      storage.clear();
      expect(await storage.getItem('key1')).toBeNull();
      expect(await storage.getItem('key2')).toBeNull();
    });
  });
});

