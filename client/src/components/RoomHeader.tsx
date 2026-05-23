import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../stores/useRoomStore';
import { useToast } from '../contexts/ToastContext';

interface RoomHeaderProps {
  roomCode: string;
}

/** Room info bar: code display, copy link, online count, leave button. */
export default function RoomHeader({ roomCode }: RoomHeaderProps) {
  const navigate = useNavigate();
  const users = useRoomStore((s) => s.users);
  const status = useRoomStore((s) => s.connectionStatus);
  const { show } = useToast();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/room/${roomCode}`,
      );
      show('Link copied!', 'success');
    } catch {
      show('Could not copy link', 'error');
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="font-semibold">SyncWatch</span>
        <span className="text-sm text-text-secondary">
          Room: <span className="font-mono text-text-primary">{roomCode}</span>
        </span>
        <button
          onClick={copyLink}
          className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
        >
          Copy Link
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="group relative flex items-center gap-1 text-sm"
          title={users.map((u) => u.username).join(', ')}
        >
          <span
            className={
              status === 'connected'
                ? 'h-2 w-2 rounded-full bg-success'
                : 'h-2 w-2 animate-pulse rounded-full bg-warning'
            }
          />
          <span className="text-text-secondary">
            {users.length} online
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:border-border-hover hover:text-error"
        >
          Leave
        </button>
      </div>
    </header>
  );
}
