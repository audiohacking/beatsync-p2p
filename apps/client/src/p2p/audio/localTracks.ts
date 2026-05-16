const DB_NAME = "beatsync-p2p";
const STORE_NAME = "tracks";
const DB_VERSION = 1;

export interface LocalTrackRecord {
  trackId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "trackId" });
      }
    };
  });
}

export async function saveLocalTrack(record: LocalTrackRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(STORE_NAME).put(record);
  });
}

export async function getLocalTrack(trackId: string): Promise<LocalTrackRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB read failed"));
    const request = tx.objectStore(STORE_NAME).get(trackId);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as LocalTrackRecord | undefined) ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB get failed"));
  });
}

export async function deleteLocalTrack(trackId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    tx.objectStore(STORE_NAME).delete(trackId);
  });
}
