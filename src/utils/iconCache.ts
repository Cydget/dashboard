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

export async function hasCachedIcon(url: string): Promise<boolean> {
  try {
    const db = await getDb();
    const entry = await db.get('icons', url);
    return Boolean(entry?.blob);
  } catch {
    return false;
  }
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

export async function persistIconFromUrl(key: string, src: string): Promise<boolean> {
  if (!key || !src || src.startsWith('blob:')) return false;
  try {
    const db = await getDb();
    const existing = await db.get('icons', key);
    const response = await fetch(src);
    if (!response.ok) return false;
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/json') || type.includes('text/html')) return false;
    const blob = await response.blob();
    if (blob.size < 16) return false;
    if (existing?.blob && existing.blob.size >= blob.size && existing.blob.size > 2048) {
      return false;
    }
    await putCachedIcon(key, blob);
    return true;
  } catch {
    return false;
  }
}

export async function clearIconCache(): Promise<void> {
  const db = await getDb();
  await db.clear('icons');
}
