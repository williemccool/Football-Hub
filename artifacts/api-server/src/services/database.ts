/**
 * Portable database interface.
 *
 * The api-server is intentionally vendor-neutral: gameplay routes only depend
 * on this interface. Swap the in-memory implementation for Postgres, SQLite,
 * Mongo, etc. by writing a new adapter that satisfies `Database`.
 */

export interface UserRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: unknown; // canonical game state JSON blob
  stateVersion: number;
}

export interface Database {
  getUser(id: string): Promise<UserRecord | null>;
  upsertUser(id: string, state: unknown, stateVersion: number): Promise<UserRecord>;
  listUsers(): Promise<UserRecord[]>;
  deleteUser(id: string): Promise<void>;
}

class InMemoryDatabase implements Database {
  private users = new Map<string, UserRecord>();

  async getUser(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async upsertUser(
    id: string,
    state: unknown,
    stateVersion: number,
  ): Promise<UserRecord> {
    const existing = this.users.get(id);
    const now = Date.now();
    const record: UserRecord = {
      id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      state,
      stateVersion,
    };
    this.users.set(id, record);
    return record;
  }

  async listUsers(): Promise<UserRecord[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }
}

let _db: Database | null = null;

export function getDatabase(): Database {
  if (!_db) _db = new InMemoryDatabase();
  return _db;
}
