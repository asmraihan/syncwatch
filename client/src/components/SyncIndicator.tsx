import { useEffect, useRef, useState } from 'react';
import { on } from '../utils/syncBus';
import { formatTime } from '../utils/formatTime';

interface Indicator {
  id: number;
  text: string;
  icon: string;
}

const DISPLAY_MS = 2500;

/**
 * Transient overlay shown over the video whenever a *peer* performs a sync
 * action. Sits inside the same container that goes fullscreen, so it stays
 * visible in fullscreen mode. Local actions are not announced — the user
 * already knows what they did.
 */
export default function SyncIndicator() {
  const [items, setItems] = useState<Indicator[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const add = (text: string, icon: string) => {
      const id = ++counterRef.current;
      setItems((prev) => [...prev, { id, text, icon }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, DISPLAY_MS);
    };

    const offSync = on('remote-sync', ({ action, timestamp, username }) => {
      if (action === 'play') {
        add(`${username} resumed at ${formatTime(timestamp)}`, '▶');
      } else if (action === 'pause') {
        add(`${username} paused at ${formatTime(timestamp)}`, '⏸');
      } else {
        add(`${username} jumped to ${formatTime(timestamp)}`, '⤳');
      }
    });

    const offBuffer = on('buffer', ({ kind, username }) => {
      if (kind === 'start') {
        add(`${username} is buffering...`, '⏳');
      }
    });

    return () => {
      offSync();
      offBuffer();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((i) => (
        <div
          key={i.id}
          className="flex animate-slide-down items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 text-sm text-white shadow-lg backdrop-blur-sm"
        >
          <span className="text-base leading-none">{i.icon}</span>
          <span>{i.text}</span>
        </div>
      ))}
    </div>
  );
}
