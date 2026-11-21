import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface IconDB extends DBSchema {
  icons: {
    key: string;
    value: { url: string; blob: Blob; timestamp: number };
  };
}

let dbPromise: Promise<IDBPDatabase<IconDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<IconDB>('dashboard-icons', 1, {
      upgrade(db) {
        db.createObjectStore('icons', { keyPath: 'url' });
      },
    });
  }
  return dbPromise;
}

export async function getCachedIcon(url: string): Promise<string | null> {
  try {
    const db = await getDb();
    const entry = await db.get('icons', url);
    if (entry?.blob) {
      return URL.createObjectURL(entry.blob);
    }
  } catch (error) {
    console.error('icon cache read failed', error);
  }
  return null;
}

export async function putCachedIcon(url: string, blob: Blob): Promise<string> {
  const db = await getDb();
  await db.put('icons', { url, blob, timestamp: Date.now() });
  return URL.createObjectURL(blob);
}

export async function clearIconCache(): Promise<void> {
  const db = await getDb();
  await db.clear('icons');
}
