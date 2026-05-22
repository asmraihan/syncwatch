import { useNavigate } from 'react-router-dom';

interface RoomHeaderProps {
  roomCode: string;
}

/** Room info bar: code display, copy link, online count, subtitle + leave buttons. */
export default function RoomHeader({ roomCode }: RoomHeaderProps) {
  const navigate = useNavigate();

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
    // TODO(polish phase): show "Link copied!" toast.
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
        {/* TODO: online user count, subtitle (CC) button */}
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
