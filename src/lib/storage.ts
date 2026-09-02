/**
 * Clave-valor persistente multiplataforma para preferencias ligeras
 * (vista seleccionada, filtros). Nativo: AsyncStorage cargado perezosamente;
 * web: localStorage; fallback: memoria.
 */
import { Platform } from 'react-native';

type KeyValue = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const memory = new Map<string, string>();

const memoryStorage: KeyValue = {
  async getItem(key) {
    return memory.get(key) ?? null;
  },
  async setItem(key, value) {
    memory.set(key, value);
  },
  async removeItem(key) {
    memory.delete(key);
  },
};

function createWebStorage(): KeyValue {
  return {
    async getItem(key) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return memoryStorage.getItem(key);
      }
    },
    async setItem(key, value) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        await memoryStorage.setItem(key, value);
      }
    },
    async removeItem(key) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        await memoryStorage.removeItem(key);
      }
    },
  };
}

function createNativeStorage(): KeyValue {
  try {
    const AsyncStorage = (
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga perezosa de módulo nativo
      require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')
    ).default;
    return {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
    };
  } catch {
    // Binario nativo sin el módulo: preferencias solo en memoria.
    return memoryStorage;
  }
}

export const storage: KeyValue = Platform.OS === 'web' ? createWebStorage() : createNativeStorage();

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson(key: string, value: unknown): Promise<void> {
  return storage.setItem(key, JSON.stringify(value));
}
