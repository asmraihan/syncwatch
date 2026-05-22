import type { RefObject } from 'react';

interface PlayerControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

/**
 * Custom overlay controls: seekbar, play/pause, skip ±10s, volume,
 * time display, subtitle (CC) button, fullscreen.
 *
 * To be implemented in the controls phase:
 *  - Seekbar with played + buffered fill and hover time preview
 *  - Keyboard shortcuts (Space/K, F, M, arrows)
 *  - Auto-hide after 3s of no mouse movement (always shown when paused)
 */
export default function PlayerControls({ videoRef }: PlayerControlsProps) {
  void videoRef;
  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 backdrop-blur-sm">
      {/* TODO(controls phase): seekbar + control buttons */}
      <div className="h-1 w-full rounded-full bg-player-buffer" />
      <p className="mt-2 text-xs text-white/60">Player controls — coming next</p>
    </div>
  );
}
