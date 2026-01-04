// Mock implementation of AsyncStorage for testing
const storage = new Map();

const AsyncStorage = {
  getItem: jest.fn((key) => {
    return Promise.resolve(storage.get(key) || null);
  }),
  
  setItem: jest.fn((key, value) => {
    storage.set(key, value);
    return Promise.resolve();
  }),
  
  removeItem: jest.fn((key) => {
    storage.delete(key);
    return Promise.resolve();
  }),
  
  clear: jest.fn(() => {
    storage.clear();
    return Promise.resolve();
  }),
  
  getAllKeys: jest.fn(() => {
    return Promise.resolve([...storage.keys()]);
  }),
  
  multiGet: jest.fn((keys) => {
    return Promise.resolve(keys.map((key) => [key, storage.get(key) || null]));
  }),
  
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([key, value]) => storage.set(key, value));
    return Promise.resolve();
  }),
  
  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => storage.delete(key));
    return Promise.resolve();
  }),
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
