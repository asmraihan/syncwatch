import { useRef } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useSubtitles } from '../hooks/useSubtitles';

/** Subtitle (CC) panel: drop zone, track radios, Off option, ±0.5s offset. */
export default function SubtitlePanel() {
  const tracks = usePlayerStore((s) => s.tracks);
  const activeLabel = usePlayerStore((s) => s.activeTrackLabel);
  const { uploadFile, selectTrack, setOffset } = useSubtitles();
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTrack = tracks.find((t) => t.label === activeLabel) ?? null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-20 right-2 z-10 w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-border bg-bg-elevated p-3 text-sm shadow-xl sm:right-3"
    >
      <p className="mb-2 font-medium">Subtitles</p>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) uploadFile(file);
        }}
        className="mb-3 cursor-pointer rounded-md border border-dashed border-border px-3 py-3 text-center text-xs text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
      >
        Drop .srt / .vtt / .ass file
        <input
          ref={inputRef}
          type="file"
          accept=".srt,.vtt,.ass,.ssa"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
      </div>

      {/* Track list */}
      <div className="space-y-1">
        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-bg-tertiary">
          <input
            type="radio"
            name="track"
            checked={activeLabel === null}
            onChange={() => selectTrack(null)}
            className="accent-accent"
          />
          <span className="text-text-secondary">Off</span>
        </label>
        {tracks.map((t) => (
          <label
            key={t.label}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-bg-tertiary"
          >
            <input
              type="radio"
              name="track"
              checked={activeLabel === t.label}
              onChange={() => selectTrack(t.label)}
              className="accent-accent"
            />
            <span className="truncate">{t.label}</span>
          </label>
        ))}
      </div>

      {/* Offset controls (active track only) */}
      {activeTrack && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 text-xs text-text-secondary">Timing offset</p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setOffset(activeTrack.label, activeTrack.offset - 0.5)}
              className="rounded border border-border px-2 py-0.5 text-xs hover:border-border-hover"
            >
              − 0.5s
            </button>
            <span className="font-mono text-xs">
              {activeTrack.offset >= 0 ? '+' : ''}
              {activeTrack.offset.toFixed(1)}s
            </span>
            <button
              onClick={() => setOffset(activeTrack.label, activeTrack.offset + 0.5)}
              className="rounded border border-border px-2 py-0.5 text-xs hover:border-border-hover"
            >
              + 0.5s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
