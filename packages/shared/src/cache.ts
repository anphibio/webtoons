export type CacheKind = "ocr" | "translation";

interface CacheEntry {
  id: string;
  kind: CacheKind;
  key: string;
  value: unknown;
  expiresAt: number;
  updatedAt: number;
}

export class IndexedDbCacheStore {
  private readonly databasePromise: Promise<IDBDatabase>;

  constructor(private readonly databaseName = "webtoon-translator-cache") {
    this.databasePromise = openDatabase(databaseName);
  }

  async get<T>(kind: CacheKind, key: string): Promise<T | null> {
    const database = await this.databasePromise;
    const entry = await request<CacheEntry | undefined>(database.transaction("entries", "readonly").objectStore("entries").get(entryId(kind, key)));
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      await this.delete(kind, key);
      return null;
    }
    return entry.value as T;
  }

  async put<T>(kind: CacheKind, key: string, value: T, ttlMs: number): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction("entries", "readwrite");
    transaction.objectStore("entries").put({
      id: entryId(kind, key),
      kind,
      key,
      value,
      expiresAt: Date.now() + ttlMs,
      updatedAt: Date.now(),
    } satisfies CacheEntry);
    await transactionComplete(transaction);
  }

  async delete(kind: CacheKind, key: string): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction("entries", "readwrite");
    transaction.objectStore("entries").delete(entryId(kind, key));
    await transactionComplete(transaction);
  }

  async clear(): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction("entries", "readwrite");
    transaction.objectStore("entries").clear();
    await transactionComplete(transaction);
  }
}

export function createCacheKey(...parts: string[]): string {
  let hash = 2166136261;
  for (const character of parts.join("\u001f")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(name, 1);
    openRequest.onupgradeneeded = () => openRequest.result.createObjectStore("entries", { keyPath: "id" });
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error ?? new Error("Não foi possível abrir o cache"));
  });
}

function entryId(kind: CacheKind, key: string): string {
  return `${kind}:${key}`;
}

function request<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Operação de cache falhou"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Transação de cache falhou"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transação de cache abortada"));
  });
}
