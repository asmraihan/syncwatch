import { cuesToVtt } from './subtitleParser';
import { saveSubtitle } from './db';
import { usePlayerStore } from '../stores/usePlayerStore';
import type { SubtitleCue } from '../types';

interface IngestParams {
  roomCode: string;
  label: string;
  cues: SubtitleCue[];
  uploadedBy: string;
  uploadedAt?: number;
  offset?: number;
  /** Persist to IndexedDB. False when restoring (we already have the record). */
  persist?: boolean;
  /** Force this track to become the active one (otherwise activate only if none). */
  setActive?: boolean;
}

/**
 * Build a VTT blob URL for a cue array and add it to the player store.
 * Optionally persists to IndexedDB. Shared by local uploads, remote shares,
 * DB restores, and offset adjustments.
 */
export async function ingestSubtitleTrack({
  roomCode,
  label,
  cues,
  uploadedBy,
  uploadedAt = Date.now(),
  offset = 0,
  persist = true,
  setActive = false,
}: IngestParams): Promise<void> {
  const vttContent = cuesToVtt(cues, offset);
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  const vttUrl = URL.createObjectURL(blob);

  const store = usePlayerStore.getState();
  // Revoke any previous blob URL for this label to avoid leaks.
  const existing = store.tracks.find((t) => t.label === label);
  if (existing) URL.revokeObjectURL(existing.vttUrl);

  store.addTrack({
    label,
    cues,
    vttUrl,
    uploadedBy,
    uploadedAt,
    offset,
  });

  if (persist) {
    await saveSubtitle({
      roomCode,
      label,
      vttContent,
      cues,
      uploadedBy,
      uploadedAt,
    });
  }

  if (setActive || !store.activeTrackLabel) {
    store.setActiveTrack(label);
  }
}
