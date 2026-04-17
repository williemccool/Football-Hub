import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CacheService } from "./types";

class AsyncStorageCache implements CacheService {
  async read<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  async write<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}

export const cache: CacheService = new AsyncStorageCache();
