import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRoomCode } from '../utils/nameGenerator';

export default function LandingPage() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  const createRoom = () => {
    navigate(`/room/${generateRoomCode()}`);
  };

  const joinRoom = () => {
    const code = joinCode.trim().toLowerCase();
    if (code.length === 6) navigate(`/room/${code}`);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight">SyncWatch</h1>
        <p className="mt-3 text-text-secondary">
          Watch local videos together, perfectly in sync.
        </p>
      </header>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* Create */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 transition-colors hover:border-border-hover">
          <h2 className="text-xl font-semibold">Create a Room</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Start a new room and share the link.
          </p>
          <button
            onClick={createRoom}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover hover:shadow-glow"
          >
            Create Room
          </button>
        </div>

        {/* Join */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 transition-colors hover:border-border-hover">
          <h2 className="text-xl font-semibold">Join a Room</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Enter a 6-character room code.
          </p>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            maxLength={6}
            placeholder="X7kM2p"
            className="mt-4 w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-white placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={joinRoom}
            className="mt-3 w-full rounded-lg border border-border bg-transparent px-4 py-2 font-medium transition-colors hover:border-border-hover"
          >
            Join
          </button>
        </div>
      </div>

      <footer className="mt-16 text-sm text-text-muted">
        SyncWatch — No uploads. No accounts. Just sync.
      </footer>
    </div>
  );
}
