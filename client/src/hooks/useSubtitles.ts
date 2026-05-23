import { useCallback } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useRoomStore } from '../stores/useRoomStore';
import { useWebSocketSend } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';
import {
  labelFromFilename,
  parseSubtitleFile,
} from '../utils/subtitleParser';
import { ingestSubtitleTrack } from '../utils/subtitleIngest';

/**
 * Subtitle controller actions: file upload + share, track selection, and
 * timing offset. Restoration from IndexedDB happens once in RoomPage.
 */
export function useSubtitles() {
  const { send } = useWebSocketSend();
  const { show } = useToast();

  // ---- Upload a local subtitle file ----
  const uploadFile = useCallback(
    async (file: File) => {
      try {
        const cues = await parseSubtitleFile(file);
        const label = labelFromFilename(file.name);
        const { roomCode, username } = useRoomStore.getState();
        await ingestSubtitleTrack({
          roomCode,
          label,
          cues,
          uploadedBy: username,
          setActive: true,
        });
        // Share parsed cues over WebSocket (NOT the raw file text).
        send({ type: 'subtitle_share', label, cues });
        show(`Subtitles loaded: ${label}`, 'success');
      } catch (err) {
        show(
          err instanceof Error ? err.message : 'Failed to load subtitles',
          'error',
        );
      }
    },
    [send, show],
  );

  // ---- Activate or disable a track ----
  const selectTrack = useCallback((label: string | null) => {
    usePlayerStore.getState().setActiveTrack(label);
  }, []);

  // ---- Adjust local-only timing offset (regenerate VTT blob) ----
  const setOffset = useCallback(async (label: string, offset: number) => {
    const { tracks, activeTrackLabel } = usePlayerStore.getState();
    const track = tracks.find((t) => t.label === label);
    if (!track) return;
    const { roomCode } = useRoomStore.getState();
    await ingestSubtitleTrack({
      roomCode,
      label,
      cues: track.cues,
      uploadedBy: track.uploadedBy,
      uploadedAt: track.uploadedAt,
      offset,
      persist: false, // offset is local-only — don't overwrite the canonical record
      setActive: activeTrackLabel === label,
    });
  }, []);

  return { uploadFile, selectTrack, setOffset };
}
