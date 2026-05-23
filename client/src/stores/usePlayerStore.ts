import { create } from 'zustand';
import type { FileMeta, SubtitleTrack } from '../types';

interface PlayerState {
  // media
  fileMeta: FileMeta | null;
  videoUrl: string | null;

  // playback
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  playbackRate: number;

  // sync internals
  isRemoteAction: boolean;
  isBuffering: boolean;

  // subtitles
  tracks: SubtitleTrack[];
  activeTrackLabel: string | null;

  // peers' loaded file metadata (for size-mismatch warnings)
  peerFiles: Record<string, FileMeta>;

  // actions
  setFile: (meta: FileMeta, url: string) => void;
  clearFile: () => void;
  setPeerFile: (username: string, meta: FileMeta) => void;
  removePeerFile: (username: string) => void;
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setRemoteAction: (isRemoteAction: boolean) => void;
  setBuffering: (isBuffering: boolean) => void;
  addTrack: (track: SubtitleTrack) => void;
  setActiveTrack: (label: string | null) => void;
  reset: () => void;
}

const storedVolume = Number(localStorage.getItem('syncwatch:volume'));

export const usePlayerStore = create<PlayerState>((set) => ({
  fileMeta: null,
  videoUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: Number.isFinite(storedVolume) && storedVolume > 0 ? storedVolume : 1,
  muted: false,
  playbackRate: 1,
  isRemoteAction: false,
  isBuffering: false,
  tracks: [],
  activeTrackLabel: null,
  peerFiles: {},

  setFile: (fileMeta, videoUrl) =>
    set((state) => {
      // Revoke the previous object URL so we don't leak memory.
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
      return { fileMeta, videoUrl };
    }),
  clearFile: () =>
    set((state) => {
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
      return { fileMeta: null, videoUrl: null };
    }),
  setPeerFile: (username, meta) =>
    set((state) => ({
      peerFiles: { ...state.peerFiles, [username]: meta },
    })),
  removePeerFile: (username) =>
    set((state) => {
      const next = { ...state.peerFiles };
      delete next[username];
      return { peerFiles: next };
    }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setBuffered: (buffered) => set({ buffered }),
  setVolume: (volume) => {
    localStorage.setItem('syncwatch:volume', String(volume));
    set({ volume });
  },
  setMuted: (muted) => set({ muted }),
  setRemoteAction: (isRemoteAction) => set({ isRemoteAction }),
  setBuffering: (isBuffering) => set({ isBuffering }),
  addTrack: (track) =>
    set((state) => ({
      tracks: [
        ...state.tracks.filter((t) => t.label !== track.label),
        track,
      ],
    })),
  setActiveTrack: (activeTrackLabel) => set({ activeTrackLabel }),
  reset: () =>
    set((state) => {
      if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
      for (const t of state.tracks) URL.revokeObjectURL(t.vttUrl);
      return {
        fileMeta: null,
        videoUrl: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        buffered: 0,
        isRemoteAction: false,
        isBuffering: false,
        tracks: [],
        activeTrackLabel: null,
        peerFiles: {},
      };
    }),
}));
