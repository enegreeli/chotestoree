/**
 * 100% LOCAL BROWSER STORAGE ENGINE (IndexedDB + localStorage fallback)
 * Stores full catalog, products, categories, stock, orders, and settings
 * directly on the user's device/browser without ANY external cloud APIs or third parties.
 */

const DB_NAME = 'chote_store_local_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'chote_store_data';
const SNAPSHOT_KEY = 'master_store_snapshot';
const LS_FALLBACK_KEY = 'chote_master_db_snapshot_v1';
const WIPED_FLAG = 'chote_master_db_explicitly_wiped';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target?.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target?.result as IDBDatabase);
      };

      request.onerror = () => {
        console.warn('IndexedDB open failed, falling back to localStorage');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves a full snapshot of the store database to IndexedDB and localStorage.
 */
export async function saveLocalSnapshot(data: any): Promise<boolean> {
  if (typeof window === 'undefined' || !data) return false;

  try {
    // 1. Save to localStorage for instant synchronous access
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(LS_FALLBACK_KEY, serialized);
      localStorage.setItem('chote_master_db_count_v1', (data.products?.length || 0).toString());
      localStorage.removeItem(WIPED_FLAG);
    } catch (lsErr) {
      // localStorage may fail on quota; IndexedDB will handle large payloads
      console.warn('localStorage save warning (quota):', lsErr);
    }

    // 2. Save to IndexedDB (virtually unlimited local storage for large images & products)
    const db = await openDatabase();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(data, SNAPSHOT_KEY);

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    }

    return true;
  } catch (err) {
    console.error('Error saving local snapshot:', err);
    return false;
  }
}

/**
 * Loads the local snapshot from IndexedDB (or localStorage fallback).
 */
export async function loadLocalSnapshot(): Promise<any | null> {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Try IndexedDB first
    const db = await openDatabase();
    if (db) {
      const fromIdb = await new Promise<any | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(SNAPSHOT_KEY);

          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (fromIdb && fromIdb.products && fromIdb.products.length > 0) {
        return fromIdb;
      }
    }

    // 2. Fallback to localStorage
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading local snapshot:', err);
  }

  return null;
}

/**
 * Marks that the catalog was explicitly cleared by the user.
 */
export function markCatalogWiped(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WIPED_FLAG, 'true');
  localStorage.removeItem(LS_FALLBACK_KEY);
  openDatabase().then((db) => {
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(SNAPSHOT_KEY);
      } catch {}
    }
  });
}

/**
 * Checks if the catalog was explicitly wiped.
 */
export function isCatalogExplicitlyWiped(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(WIPED_FLAG) === 'true';
}
