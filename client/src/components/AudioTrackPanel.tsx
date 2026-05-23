import { useEffect, useState, type RefObject } from 'react';

interface AudioTrackPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

interface TrackInfo {
  id: string;
  label: string;
  enabled: boolean;
}

/**
 * Audio-track selector. Reads `video.audioTracks` and lets the user enable
 * one track at a time. Browser support is limited — Safari surfaces all
 * tracks in MP4/MOV; Chrome and Firefox usually expose only one even when
 * the file contains multiple streams. The panel shows a clear notice in
 * that case so the user understands why nothing's selectable.
 */
export default function AudioTrackPanel({ videoRef }: AudioTrackPanelProps) {
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const list = video.audioTracks as AudioTrackList | undefined;
    if (!list) {
      setSupported(false);
      return;
    }

    const refresh = () => {
      const items: TrackInfo[] = [];
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        items.push({
          id: t.id || `track-${i}`,
          label: t.label || t.language || `Track ${i + 1}`,
          enabled: t.enabled,
        });
      }
      setTracks(items);
    };

    refresh();
    video.addEventListener('loadedmetadata', refresh);
    list.addEventListener?.('addtrack', refresh);
    list.addEventListener?.('removetrack', refresh);
    list.addEventListener?.('change', refresh);

    return () => {
      video.removeEventListener('loadedmetadata', refresh);
      list.removeEventListener?.('addtrack', refresh);
      list.removeEventListener?.('removetrack', refresh);
      list.removeEventListener?.('change', refresh);
    };
  }, [videoRef]);

  const selectTrack = (id: string) => {
    const list = videoRef.current?.audioTracks as AudioTrackList | undefined;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      list[i].enabled = list[i].id === id || (!list[i].id && `track-${i}` === id);
    }
    setTracks((prev) => prev.map((t) => ({ ...t, enabled: t.id === id })));
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-20 right-3 z-10 w-72 rounded-lg border border-border bg-bg-elevated p-3 text-sm shadow-xl"
    >
      <p className="mb-2 font-medium">Audio</p>

      {!supported ? (
        <p className="text-xs text-text-muted">
          Your browser doesn't expose audio tracks.
        </p>
      ) : tracks.length === 0 ? (
        <p className="text-xs text-text-muted">No audio tracks detected.</p>
      ) : tracks.length === 1 ? (
        <p className="text-xs text-text-muted">
          Only one audio track in this file.
        </p>
      ) : (
        <div className="space-y-1">
          {tracks.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-bg-tertiary"
            >
              <input
                type="radio"
                name="audio-track"
                checked={t.enabled}
                onChange={() => selectTrack(t.id)}
                className="accent-accent"
              />
              <span className="truncate">{t.label}</span>
            </label>
          ))}
        </div>
      )}

      <p className="mt-3 border-t border-border pt-2 text-[11px] leading-snug text-text-muted">
        Note: Chrome and Firefox typically expose only one audio track per
        file. Safari and some MKV containers support multiple.
      </p>
    </div>
  );
}
