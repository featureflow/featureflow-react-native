import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeatureflowStorage } from './types';

/**
 * AsyncStorage-based storage implementation for React Native.
 * Uses @react-native-async-storage/async-storage for persistent storage.
 */
export class ReactNativeStorage implements FeatureflowStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('[Featureflow] Failed to get item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('[Featureflow] Failed to set item in storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('[Featureflow] Failed to remove item from storage:', error);
    }
  }
}

/**
 * In-memory storage for testing or environments without AsyncStorage.
 */
export class MemoryStorage implements FeatureflowStorage {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

// Default storage instance
let defaultStorage: FeatureflowStorage;

/**
 * Get the default storage instance.
 * Uses AsyncStorage in React Native, falls back to memory storage if unavailable.
 */
export function getDefaultStorage(): FeatureflowStorage {
  if (!defaultStorage) {
    try {
      // Check if AsyncStorage is available
      if (AsyncStorage) {
        defaultStorage = new ReactNativeStorage();
      } else {
        defaultStorage = new MemoryStorage();
      }
    } catch {
      // Fallback to memory storage if AsyncStorage is not available
      defaultStorage = new MemoryStorage();
    }
  }
  return defaultStorage;
}

