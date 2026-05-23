import { useEffect, useRef, type RefObject } from 'react';
import { useWebSocketSend } from '../contexts/WebSocketContext';
import { useRoomStore } from '../stores/useRoomStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { on } from '../utils/syncBus';

const SEEK_DEBOUNCE_MS = 200;
const HEARTBEAT_INTERVAL_MS = 2000;
const DRIFT_SOFT_THRESHOLD = 0.15; // seconds
const DRIFT_HARD_THRESHOLD = 0.5;
const TIME_EPSILON = 0.05; // seconds — below this we don't bother seeking
const EVENT_TIMEOUT_MS = 750;

/**
 * Resolve once the given event fires on `target`, or after `timeoutMs`.
 * Used to keep `isRemoteAction` true until the DOM event from a programmatic
 * mutation has fired and been (suppressed) by the listener — preventing
 * the echo loop where every remote seek/play/pause re-emits as a local one.
 */
function waitForEvent(
  target: EventTarget,
  event: string,
  timeoutMs = EVENT_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      target.removeEventListener(event, finish);
      window.clearTimeout(timeoutId);
      resolve();
    };
    target.addEventListener(event, finish);
    const timeoutId = window.setTimeout(finish, timeoutMs);
  });
}

async function programmaticSeek(
  video: HTMLVideoElement,
  time: number,
): Promise<void> {
  if (Math.abs(video.currentTime - time) < TIME_EPSILON) return;
  const wait = waitForEvent(video, 'seeked');
  video.currentTime = time;
  await wait;
}

async function programmaticPlay(video: HTMLVideoElement): Promise<void> {
  if (!video.paused) return;
  const wait = waitForEvent(video, 'play');
  video.play().catch(() => {});
  await wait;
}

async function programmaticPause(video: HTMLVideoElement): Promise<void> {
  if (video.paused) return;
  const wait = waitForEvent(video, 'pause');
  video.pause();
  await wait;
}

/** Run a sequence of programmatic video mutations with the remote-action flag held. */
async function applyAsRemote(work: () => Promise<void>): Promise<void> {
  usePlayerStore.getState().setRemoteAction(true);
  try {
    await work();
  } finally {
    usePlayerStore.getState().setRemoteAction(false);
  }
}

/**
 * Sync protocol logic — owns <video> event listeners and applies remote sync.
 *
 * Outbound: play/pause/seek (debounced) + buffer_start/end + host heartbeat.
 * Inbound (via syncBus): remote sync, heartbeat drift correction, buffer pause.
 */
export function useSync(videoRef: RefObject<HTMLVideoElement | null>) {
  const { send, latencyMs } = useWebSocketSend();
  // The <video> element mounts after a file is loaded. Use videoUrl as a
  // signal so the listener-attachment effect re-runs once the element exists.
  const videoUrl = usePlayerStore((s) => s.videoUrl);

  // Stable refs for values used inside event listeners.
  const sendRef = useRef(send);
  sendRef.current = send;
  const latencyRef = useRef(latencyMs);
  latencyRef.current = latencyMs;

  // --- Local video event listeners (outbound emit) ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let seekTimer: number | null = null;
    let wasBuffering = false;

    const onPlay = () => {
      const { isRemoteAction } = usePlayerStore.getState();
      usePlayerStore.getState().setPlaying(true);
      if (isRemoteAction) return;
      sendRef.current({
        type: 'sync',
        action: 'play',
        timestamp: video.currentTime,
        wallClock: Date.now(),
      });
    };

    const onPause = () => {
      const { isRemoteAction } = usePlayerStore.getState();
      usePlayerStore.getState().setPlaying(false);
      if (isRemoteAction) return;
      sendRef.current({
        type: 'sync',
        action: 'pause',
        timestamp: video.currentTime,
        wallClock: Date.now(),
      });
    };

    const onSeeked = () => {
      if (usePlayerStore.getState().isRemoteAction) return;
      if (seekTimer !== null) window.clearTimeout(seekTimer);
      // Debounce: dragging the seekbar fires many `seeked` events. We also
      // re-check isRemoteAction at fire time because a remote action could
      // arrive during the debounce window.
      seekTimer = window.setTimeout(() => {
        if (usePlayerStore.getState().isRemoteAction) return;
        sendRef.current({
          type: 'sync',
          action: 'seek',
          timestamp: video.currentTime,
          wallClock: Date.now(),
        });
      }, SEEK_DEBOUNCE_MS);
    };

    const onTimeUpdate = () => {
      usePlayerStore.getState().setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        usePlayerStore
          .getState()
          .setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const onDurationChange = () => {
      usePlayerStore.getState().setDuration(video.duration || 0);
    };

    const onWaiting = () => {
      // Only treat as a real stall once playback has started.
      if (video.readyState >= 3 || video.paused) return;
      wasBuffering = true;
      usePlayerStore.getState().setBuffering(true);
      sendRef.current({ type: 'buffer_start' });
    };

    const onPlaying = () => {
      if (wasBuffering) {
        wasBuffering = false;
        usePlayerStore.getState().setBuffering(false);
        sendRef.current({ type: 'buffer_end' });
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    // Initialize duration if the metadata is already loaded.
    if (!Number.isNaN(video.duration) && video.duration > 0) {
      usePlayerStore.getState().setDuration(video.duration);
    }

    return () => {
      if (seekTimer !== null) window.clearTimeout(seekTimer);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, [videoRef, videoUrl]);

  // --- Apply remote sync events (inbound) ---
  useEffect(() => {
    const offSync = on('remote-sync', ({ action, timestamp }) => {
      const video = videoRef.current;
      if (!video) return;
      void applyAsRemote(async () => {
        if (action === 'play') {
          if (Math.abs(video.currentTime - timestamp) > 0.2) {
            await programmaticSeek(video, timestamp);
          }
          await programmaticPlay(video);
        } else if (action === 'pause') {
          await programmaticPause(video);
          await programmaticSeek(video, timestamp);
        } else if (action === 'seek') {
          await programmaticSeek(video, timestamp);
        }
      });
    });

    const offHeartbeat = on('heartbeat', ({ timestamp, playbackState }) => {
      const video = videoRef.current;
      if (!video) return;
      // Host doesn't drift-correct itself.
      if (useRoomStore.getState().isHost()) return;

      const expected = timestamp + latencyRef.current / 1000;
      const drift = Math.abs(video.currentTime - expected);
      const stateMismatch =
        (playbackState === 'playing' && video.paused) ||
        (playbackState === 'paused' && !video.paused);
      const needsHardSeek =
        playbackState === 'playing' && drift > DRIFT_HARD_THRESHOLD;

      if (stateMismatch || needsHardSeek) {
        void applyAsRemote(async () => {
          if (stateMismatch) {
            if (playbackState === 'playing') await programmaticPlay(video);
            else await programmaticPause(video);
          }
          if (needsHardSeek) {
            await programmaticSeek(video, expected);
          }
        });
      } else if (
        playbackState === 'playing' &&
        drift > DRIFT_SOFT_THRESHOLD
      ) {
        // Soft correction via temporary playbackRate nudge.
        video.playbackRate = video.currentTime < expected ? 1.05 : 0.95;
        window.setTimeout(() => {
          video.playbackRate = 1.0;
        }, 1000);
      }
    });

    const offBuffer = on('buffer', ({ kind }) => {
      const video = videoRef.current;
      if (!video) return;
      void applyAsRemote(async () => {
        if (kind === 'start') await programmaticPause(video);
        else await programmaticPlay(video);
      });
    });

    return () => {
      offSync();
      offHeartbeat();
      offBuffer();
    };
  }, [videoRef]);

  // --- Host heartbeat (outbound, every 2s) ---
  useEffect(() => {
    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      if (!useRoomStore.getState().isHost()) return;
      sendRef.current({
        type: 'heartbeat',
        timestamp: video.currentTime,
        wallClock: Date.now(),
        playbackState: video.paused ? 'paused' : 'playing',
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [videoRef]);

  // --- Visibility re-sync: when the tab regains focus, the next host
  //     heartbeat (within 2s) will correct any drift accumulated while
  //     background timers were throttled. No active work needed here.
  useEffect(() => {
    const onVisibility = () => {
      // intentionally empty — heartbeat will catch up
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
