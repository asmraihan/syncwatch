import type { RefObject } from 'react';

/**
 * Sync protocol logic — wires the <video> element to WebSocket events.
 *
 * Responsibilities (to be implemented in the sync phase):
 *  - Emit play/pause/seek events (guarded by the `isRemoteAction` flag)
 *  - Apply remote events: set `isRemoteAction = true`, seek, await play()
 *  - Debounce `seeked` events (200ms) before emitting
 *  - Host heartbeat every 2s; peers run drift correction:
 *      < 150ms  -> no-op
 *      150-500ms -> soft correction via playbackRate (0.95 / 1.05)
 *      > 500ms  -> hard seek
 *  - Buffer handling: emit buffer_start/buffer_end on waiting/playing
 *  - Hard re-sync when the tab regains visibility
 */
export function useSync(videoRef: RefObject<HTMLVideoElement | null>) {
  // TODO(sync phase): implement event emission, drift correction, heartbeat.
  void videoRef;
}
