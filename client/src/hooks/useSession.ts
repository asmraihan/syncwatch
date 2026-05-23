import { useMemo } from 'react';
import { generateColor, generateUsername } from '../utils/nameGenerator';

interface Session {
  userId: string;
  username: string;
  color: string;
}

/**
 * Per-tab session identity for a room. Generated once and cached in
 * sessionStorage so reconnects (and brief reloads) keep the same identity.
 * Different rooms in the same tab get different identities.
 */
export function useSession(roomCode: string): Session {
  return useMemo(() => {
    if (!roomCode) {
      return { userId: '', username: '', color: '' };
    }
    const key = `syncwatch:session:${roomCode}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored) as Session;
      } catch {
        // fall through and regenerate
      }
    }
    const session: Session = {
      userId: crypto.randomUUID(),
      username: generateUsername(),
      color: generateColor(),
    };
    sessionStorage.setItem(key, JSON.stringify(session));
    return session;
  }, [roomCode]);
}
