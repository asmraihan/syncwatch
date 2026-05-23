import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRoomStore } from '../stores/useRoomStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useToast } from '../contexts/ToastContext';
import { WebSocketContext } from '../contexts/WebSocketContext';
import { emit as emitBus } from '../utils/syncBus';
import { ingestSubtitleTrack } from '../utils/subtitleIngest';
import { getSubtitlesForRoom } from '../utils/db';
import { formatTime } from '../utils/formatTime';
import { describeFileMismatch } from '../utils/fingerprint';
import type { ServerMessage } from '../types';
import RoomHeader from './RoomHeader';
import VideoPlayer from './VideoPlayer';
import ChatPanel from './ChatPanel';

function newMsgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function syncVerb(action: 'play' | 'pause' | 'seek'): string {
  if (action === 'play') return 'played at';
  if (action === 'pause') return 'paused at';
  return 'seeked to';
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const roomCode = (code ?? '').toLowerCase();
  const session = useSession(roomCode);
  const { show } = useToast();

  // Set up local identity once.
  useEffect(() => {
    useRoomStore.getState().setIdentity({
      roomCode,
      userId: session.userId,
      username: session.username,
      color: session.color,
    });
    return () => {
      useRoomStore.getState().reset();
      usePlayerStore.getState().reset();
    };
  }, [roomCode, session.userId, session.username, session.color]);

  // Restore subtitle tracks stored for this room (from IndexedDB).
  useEffect(() => {
    if (!roomCode) return;
    (async () => {
      const records = await getSubtitlesForRoom(roomCode);
      for (const r of records) {
        await ingestSubtitleTrack({
          roomCode: r.roomCode,
          label: r.label,
          cues: r.cues,
          uploadedBy: r.uploadedBy,
          uploadedAt: r.uploadedAt,
          persist: false,
        });
      }
    })().catch(() => {});
  }, [roomCode]);

  const onMessage = useCallback(
    (msg: ServerMessage) => {
      const room = useRoomStore.getState();
      const player = usePlayerStore.getState();

      switch (msg.type) {
        case 'room_state':
          room.setUsers(msg.users);
          room.setHostId(msg.hostId);
          break;

        case 'user_joined':
          room.setUsers(msg.users);
          room.addMessage({
            id: newMsgId(),
            type: 'system',
            username: '',
            color: '',
            content: `${msg.username} joined the room`,
            timestamp: Date.now(),
          });
          break;

        case 'user_left':
          room.setUsers(msg.users);
          room.setHostId(msg.newHostId);
          player.removePeerFile(msg.username);
          room.addMessage({
            id: newMsgId(),
            type: 'system',
            username: '',
            color: '',
            content: `${msg.username} left the room`,
            timestamp: Date.now(),
          });
          break;

        case 'host_update':
          room.setHostId(msg.hostId);
          break;

        case 'chat':
          room.addMessage({
            id: newMsgId(),
            type: 'user',
            username: msg.username,
            color: msg.color,
            content: msg.content,
            timestamp: msg.timestamp,
          });
          break;

        case 'sync':
          emitBus('remote-sync', {
            action: msg.action,
            timestamp: msg.timestamp,
            wallClock: msg.wallClock,
            username: msg.username,
          });
          room.addMessage({
            id: newMsgId(),
            type: 'system',
            username: '',
            color: '',
            content: `${msg.username} ${syncVerb(msg.action)} ${formatTime(msg.timestamp)}`,
            timestamp: Date.now(),
          });
          break;

        case 'heartbeat':
          emitBus('heartbeat', {
            timestamp: msg.timestamp,
            wallClock: msg.wallClock,
            playbackState: msg.playbackState,
          });
          break;

        case 'buffer_start':
          emitBus('buffer', { kind: 'start', username: msg.username });
          room.addMessage({
            id: newMsgId(),
            type: 'system',
            username: '',
            color: '',
            content: `⏳ ${msg.username} is buffering...`,
            timestamp: Date.now(),
          });
          break;

        case 'buffer_end':
          emitBus('buffer', { kind: 'end', username: msg.username });
          break;

        case 'file_info': {
          const peerMeta = {
            name: msg.name,
            size: msg.size,
            type: '',
            fingerprint: msg.fingerprint,
          };
          player.setPeerFile(msg.username, peerMeta);
          if (player.fileMeta) {
            const mismatch = describeFileMismatch(player.fileMeta, peerMeta);
            if (mismatch) {
              show(
                `⚠️ ${msg.username}'s file differs from yours — ${mismatch}. Sync may not work correctly.`,
                'warning',
              );
            }
          }
          room.addMessage({
            id: newMsgId(),
            type: 'system',
            username: '',
            color: '',
            content: `${msg.username} loaded ${msg.name}`,
            timestamp: Date.now(),
          });
          break;
        }

        case 'subtitle_share':
          // Skip the echo of our own upload — we ingested locally already.
          if (msg.username !== room.username) {
            ingestSubtitleTrack({
              roomCode,
              label: msg.label,
              cues: msg.cues,
              uploadedBy: msg.username,
            }).catch(() => {});
          }
          room.addMessage({
            id: newMsgId(),
            type: 'system',
            username: '',
            color: '',
            content: `${msg.username} uploaded subtitles: ${msg.label}`,
            timestamp: Date.now(),
          });
          break;
      }
    },
    [show],
  );

  const joinMessage = useMemo(
    () =>
      ({
        type: 'join' as const,
        roomCode,
        userId: session.userId,
        username: session.username,
        color: session.color,
      }),
    [roomCode, session.userId, session.username, session.color],
  );

  const { send, latencyMs } = useWebSocket({
    joinMessage,
    onMessage,
    onStatusChange: (status) =>
      useRoomStore.getState().setConnectionStatus(status),
  });

  const wsValue = useMemo(() => ({ send, latencyMs }), [send, latencyMs]);
  const status = useRoomStore((s) => s.connectionStatus);

  return (
    <WebSocketContext.Provider value={wsValue}>
      <div className="flex h-full flex-col bg-bg-primary">
        <RoomHeader roomCode={roomCode} />

        {status === 'reconnecting' && (
          <div className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-sm text-warning">
            <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
            Reconnecting...
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          <main className="flex flex-1 items-center justify-center bg-black md:basis-[70%]">
            <VideoPlayer />
          </main>
          <aside className="flex min-h-0 basis-[40%] flex-col border-t border-border bg-bg-secondary md:basis-[30%] md:border-l md:border-t-0">
            <ChatPanel />
          </aside>
        </div>
      </div>
    </WebSocketContext.Provider>
  );
}
