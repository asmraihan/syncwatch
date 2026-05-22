import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SubtitleCue } from '../types';

export interface SubtitleRecord {
  key: string; // `${roomCode}:${label}`
  roomCode: string;
  label: string;
  vttContent: string;
  cues: SubtitleCue[];
  uploadedBy: string;
  uploadedAt: number;
}

interface SyncWatchDB extends DBSchema {
  subtitles: {
    key: string;
    value: SubtitleRecord;
    indexes: { 'by-room': string; 'by-date': number };
  };
}

const DB_NAME = 'syncwatch';
const DB_VERSION = 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase<SyncWatchDB>> | null = null;

function getDB(): Promise<IDBPDatabase<SyncWatchDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SyncWatchDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('subtitles', { keyPath: 'key' });
        store.createIndex('by-room', 'roomCode');
        store.createIndex('by-date', 'uploadedAt');
      },
    });
  }
  return dbPromise;
}

/** Persist a subtitle track for a room. */
export async function saveSubtitle(
  record: Omit<SubtitleRecord, 'key'>,
): Promise<void> {
  const db = await getDB();
  await db.put('subtitles', {
    ...record,
    key: `${record.roomCode}:${record.label}`,
  });
}

/** Get all subtitle tracks stored for a given room. */
export async function getSubtitlesForRoom(
  roomCode: string,
): Promise<SubtitleRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('subtitles', 'by-room', roomCode);
}

/** Delete subtitle entries older than 24 hours. Call once on app load. */
export async function cleanupOldSubtitles(): Promise<void> {
  const db = await getDB();
  const cutoff = Date.now() - ONE_DAY_MS;
  const tx = db.transaction('subtitles', 'readwrite');
  const index = tx.store.index('by-date');
  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
