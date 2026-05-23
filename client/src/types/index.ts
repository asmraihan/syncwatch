// Shared types for SyncWatch

export type SyncAction = 'play' | 'pause' | 'seek';

export type PlaybackState = 'playing' | 'paused';

export interface SubtitleCue {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export interface SubtitleTrack {
  label: string;
  cues: SubtitleCue[];
  vttUrl: string; // blob URL for the <track> element
  uploadedBy: string;
  uploadedAt: number;
  offset: number; // local-only timing offset in seconds
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  username: string;
  color: string;
  content: string;
  timestamp: number;
}

export interface RoomUser {
  id: string;
  username: string;
  color: string;
  isHost: boolean;
}

export interface FileMeta {
  name: string;
  size: number;
  type: string;
  /** Truncated SHA-256 over file head + tail. Optional for back-compat. */
  fingerprint?: string;
}

// ---- WebSocket message protocol ----

export type ClientMessage =
  | {
      type: 'join';
      roomCode: string;
      userId: string;
      username: string;
      color: string;
    }
  | { type: 'chat'; content: string }
  | {
      type: 'sync';
      action: SyncAction;
      timestamp: number;
      wallClock: number;
    }
  | {
      type: 'heartbeat';
      timestamp: number;
      wallClock: number;
      playbackState: PlaybackState;
    }
  | { type: 'buffer_start' }
  | { type: 'buffer_end' }
  | { type: 'subtitle_share'; label: string; cues: SubtitleCue[] }
  | { type: 'file_info'; name: string; size: number; fingerprint?: string }
  | { type: 'ping'; clientTime: number };

export type ServerMessage =
  | {
      type: 'user_joined';
      userId: string;
      username: string;
      color: string;
      userCount: number;
      isHost: boolean;
      users: RoomUser[];
    }
  | {
      type: 'user_left';
      userId: string;
      username: string;
      userCount: number;
      newHostId: string | null;
      users: RoomUser[];
    }
  | {
      type: 'chat';
      username: string;
      color: string;
      content: string;
      timestamp: number;
    }
  | {
      type: 'sync';
      action: SyncAction;
      timestamp: number;
      wallClock: number;
      username: string;
    }
  | {
      type: 'heartbeat';
      timestamp: number;
      wallClock: number;
      playbackState: PlaybackState;
    }
  | { type: 'buffer_start'; username: string }
  | { type: 'buffer_end'; username: string }
  | {
      type: 'subtitle_share';
      label: string;
      cues: SubtitleCue[];
      username: string;
    }
  | {
      type: 'file_info';
      username: string;
      name: string;
      size: number;
      fingerprint?: string;
    }
  | { type: 'pong'; clientTime: number; serverTime: number }
  | { type: 'host_update'; hostId: string }
  | {
      type: 'room_state';
      selfId: string;
      users: RoomUser[];
      hostId: string;
    };
