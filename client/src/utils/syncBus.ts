import type { PlaybackState, SyncAction } from '../types';

// Tiny typed event bus used to fan sync-related WebSocket messages out to
// useSync (which owns the <video> element). Decouples RoomPage's onMessage
// dispatch from the video sync logic.

export interface SyncBusEvents {
  'remote-sync': {
    action: SyncAction;
    timestamp: number;
    wallClock: number;
    username: string;
  };
  heartbeat: {
    timestamp: number;
    wallClock: number;
    playbackState: PlaybackState;
  };
  buffer: { kind: 'start' | 'end'; username: string };
}

type Handler<T> = (payload: T) => void;

type ListenerMap = {
  [K in keyof SyncBusEvents]?: Set<Handler<SyncBusEvents[K]>>;
};

const listeners: ListenerMap = {};

export function on<K extends keyof SyncBusEvents>(
  event: K,
  handler: Handler<SyncBusEvents[K]>,
): () => void {
  let set = listeners[event] as Set<Handler<SyncBusEvents[K]>> | undefined;
  if (!set) {
    set = new Set();
    listeners[event] = set as ListenerMap[K];
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

export function emit<K extends keyof SyncBusEvents>(
  event: K,
  payload: SyncBusEvents[K],
): void {
  const set = listeners[event] as Set<Handler<SyncBusEvents[K]>> | undefined;
  if (!set) return;
  for (const handler of set) handler(payload);
}
