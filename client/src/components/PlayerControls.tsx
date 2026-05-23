import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { formatTime } from '../utils/formatTime';

interface PlayerControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  onToggleSubtitles?: () => void;
  onToggleAudioTracks?: () => void;
}

const AUTO_HIDE_MS = 3000;

/**
 * Custom overlay controls: seekbar with buffer + played fill, play/pause,
 * ±10s skip, volume, time display, subtitle (CC) button, fullscreen.
 * Auto-hides after 3s of mouse stillness while playing.
 */
export default function PlayerControls({
  videoRef,
  onToggleSubtitles,
  onToggleAudioTracks,
}: PlayerControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const buffered = usePlayerStore((s) => s.buffered);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const setVolumeStore = usePlayerStore((s) => s.setVolume);
  const setMutedStore = usePlayerStore((s) => s.setMuted);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [hoverPreview, setHoverPreview] = useState<{
    x: number;
    time: number;
  } | null>(null);

  const seekRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  // ---- Player actions ----
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, [videoRef]);

  const skip = useCallback(
    (seconds: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    },
    [videoRef],
  );

  const setVolume = useCallback(
    (value: number) => {
      const v = videoRef.current;
      const clamped = Math.max(0, Math.min(1, value));
      if (v) {
        v.volume = clamped;
        v.muted = clamped === 0;
      }
      setVolumeStore(clamped);
      setMutedStore(clamped === 0);
    },
    [videoRef, setVolumeStore, setMutedStore],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMutedStore(v.muted);
  }, [videoRef, setMutedStore]);

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!document.fullscreenElement) {
      (v.parentElement ?? v).requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, [videoRef]);

  // ---- Sync initial volume on mount ----
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = volume;
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Fullscreen state tracking ----
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore keys when typing in an input.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'ArrowRight':
          skip(10);
          break;
        case 'ArrowLeft':
          skip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(volume - 0.05);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleFullscreen, toggleMute, skip, setVolume, volume]);

  // ---- Auto-hide controls on inactivity ----
  const showAndScheduleHide = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setVisible(false);
    }, AUTO_HIDE_MS);
  }, [videoRef]);

  useEffect(() => {
    // Controls are always visible when paused.
    if (!isPlaying) {
      setVisible(true);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      showAndScheduleHide();
    }
  }, [isPlaying, showAndScheduleHide]);

  useEffect(() => {
    const onMove = () => showAndScheduleHide();
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [showAndScheduleHide]);

  // ---- Seekbar interactions ----
  const seekToClientX = (clientX: number) => {
    const el = seekRef.current;
    const v = videoRef.current;
    if (!el || !v || !v.duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
  };

  const onSeekMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    seekToClientX(e.clientX);
    const onMove = (ev: MouseEvent) => seekToClientX(ev.clientX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onSeekHover = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = seekRef.current;
    const v = videoRef.current;
    if (!el || !v || !v.duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverPreview({
      x: e.clientX - rect.left,
      time: ratio * v.duration,
    });
  };

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 select-none bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-8 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Seekbar */}
      <div
        ref={seekRef}
        onMouseDown={onSeekMouseDown}
        onMouseMove={onSeekHover}
        onMouseLeave={() => setHoverPreview(null)}
        className="group relative mb-2 h-1.5 cursor-pointer rounded-full bg-player-buffer transition-all hover:h-2"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/20"
          style={{ width: `${bufferedPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-player-progress"
          style={{ width: `${playedPct}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${playedPct}%` }}
        />
        {hoverPreview && (
          <div
            className="pointer-events-none absolute bottom-4 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white"
            style={{ left: hoverPreview.x }}
          >
            {formatTime(hoverPreview.time)}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center gap-2 text-white">
        <IconButton onClick={() => skip(-10)} title="Back 10s (←)">
          <BackIcon />
        </IconButton>
        <IconButton onClick={togglePlay} title="Play / Pause (Space)">
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton onClick={() => skip(10)} title="Forward 10s (→)">
          <ForwardIcon />
        </IconButton>

        <div className="ml-2 flex items-center gap-2">
          <IconButton onClick={toggleMute} title="Mute (M)">
            {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
          </IconButton>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-20 accent-accent"
          />
        </div>

        <span className="ml-2 font-mono text-xs tabular-nums text-white/80">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {onToggleAudioTracks && (
            <IconButton onClick={onToggleAudioTracks} title="Audio tracks">
              <AudioTracksIcon />
            </IconButton>
          )}
          {onToggleSubtitles && (
            <IconButton onClick={onToggleSubtitles} title="Subtitles">
              <CcIcon />
            </IconButton>
          )}
          <IconButton onClick={toggleFullscreen} title="Fullscreen (F)">
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

// ---- Internal icon button ----

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

// ---- SVG icons (Heroicons-style, single-color) ----

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true as const,
};

const PlayIcon = () => (
  <svg {...iconProps}>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg {...iconProps}>
    <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
  </svg>
);
const BackIcon = () => (
  <svg {...iconProps}>
    <path d="M11 18V6l-8.5 6L11 18zm.5-6l8.5 6V6l-8.5 6z" />
  </svg>
);
const ForwardIcon = () => (
  <svg {...iconProps}>
    <path d="M13 6v12l8.5-6L13 6zm-.5 6L4 6v12l8.5-6z" />
  </svg>
);
const VolumeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z" />
  </svg>
);
const MuteIcon = () => (
  <svg {...iconProps}>
    <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.21.05-.42.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.96 8.96 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4l-2.11 2.11L12 8.22V4z" />
  </svg>
);
const AudioTracksIcon = () => (
  <svg {...iconProps}>
    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
  </svg>
);
const CcIcon = () => (
  <svg {...iconProps}>
    <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1z" />
  </svg>
);
const FullscreenIcon = () => (
  <svg {...iconProps}>
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
);
const ExitFullscreenIcon = () => (
  <svg {...iconProps}>
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
);
