const DB_NAME = 'pustakam-storage';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';
const CHECKPOINTS_STORE = 'checkpoints';

interface PersistedBooksRecord {
  storageKey: string;
  books: unknown[];
  bookIndex: Record<string, number>;
  updatedAt: string;
}

interface PersistedCheckpointRecord<T> {
  id: string;
  checkpoint: T;
  updatedAt: string;
}

type StoreName = typeof BOOKS_STORE | typeof CHECKPOINTS_STORE;
type StoreMode = IDBTransactionMode;

const hasIndexedDb = () => typeof window !== 'undefined' && 'indexedDB' in window;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not available'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'storageKey' });
      }

      if (!db.objectStoreNames.contains(CHECKPOINTS_STORE)) {
        db.createObjectStore(CHECKPOINTS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: StoreName,
  mode: StoreMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`IndexedDB ${mode} failed`));
  });
}

export const persistence = {
  isAvailable(): boolean {
    return hasIndexedDb();
  },

  async getBooks(storageKey: string): Promise<PersistedBooksRecord | null> {
    return withStore<PersistedBooksRecord | undefined>(BOOKS_STORE, 'readonly', store => store.get(storageKey))
      .then(record => record || null);
  },

  async saveBooks(storageKey: string, books: unknown[], bookIndex: Record<string, number>): Promise<void> {
    await withStore<IDBValidKey>(BOOKS_STORE, 'readwrite', store => store.put({
      storageKey,
      books,
      bookIndex,
      updatedAt: new Date().toISOString(),
    } satisfies PersistedBooksRecord));
  },

  async deleteBooks(storageKey: string): Promise<void> {
    await withStore<undefined>(BOOKS_STORE, 'readwrite', store => store.delete(storageKey));
  },

  async getCheckpoint<T>(id: string): Promise<T | null> {
    return withStore<PersistedCheckpointRecord<T> | undefined>(CHECKPOINTS_STORE, 'readonly', store => store.get(id))
      .then(record => record?.checkpoint ?? null);
  },

  async saveCheckpoint<T>(id: string, checkpoint: T): Promise<void> {
    await withStore<IDBValidKey>(CHECKPOINTS_STORE, 'readwrite', store => store.put({
      id,
      checkpoint,
      updatedAt: new Date().toISOString(),
    } satisfies PersistedCheckpointRecord<T>));
  },

  async deleteCheckpoint(id: string): Promise<void> {
    await withStore<undefined>(CHECKPOINTS_STORE, 'readwrite', store => store.delete(id));
  },
};
