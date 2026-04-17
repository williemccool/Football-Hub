/**
 * Portable object storage interface for replay payloads, cosmetic assets,
 * crests, and any other large blob data. Implementations could back this
 * with S3, GCS, R2, local filesystem, etc.
 */

export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
  createdAt: number;
  data: unknown;
}

export interface ObjectStorage {
  put(key: string, data: unknown, contentType?: string): Promise<StoredObject>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<{ key: string; size: number; createdAt: number }[]>;
}

class InMemoryObjectStorage implements ObjectStorage {
  private blobs = new Map<string, StoredObject>();

  async put(key: string, data: unknown, contentType = "application/json") {
    const serialized = JSON.stringify(data);
    const obj: StoredObject = {
      key,
      contentType,
      size: serialized.length,
      createdAt: Date.now(),
      data,
    };
    this.blobs.set(key, obj);
    return obj;
  }

  async get(key: string) {
    return this.blobs.get(key) ?? null;
  }

  async delete(key: string) {
    this.blobs.delete(key);
  }

  async list(prefix?: string) {
    const items = Array.from(this.blobs.values()).filter((b) =>
      prefix ? b.key.startsWith(prefix) : true,
    );
    return items.map((b) => ({ key: b.key, size: b.size, createdAt: b.createdAt }));
  }
}

let _storage: ObjectStorage | null = null;

export function getObjectStorage(): ObjectStorage {
  if (!_storage) _storage = new InMemoryObjectStorage();
  return _storage;
}
