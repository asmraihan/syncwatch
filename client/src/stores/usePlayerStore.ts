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

  // actions
  setFile: (meta: FileMeta, url: string) => void;
  clearFile: () => void;
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

  setFile: (fileMeta, videoUrl) => set({ fileMeta, videoUrl }),
  clearFile: () => set({ fileMeta: null, videoUrl: null }),
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
}));
