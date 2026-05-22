import { usePlayerStore } from '../stores/usePlayerStore';

/**
 * Subtitle (CC) panel: file drop zone, track selector with radio selection,
 * "Off" option, and local-only offset adjustment (± 0.5s).
 *
 * To be implemented in the subtitle phase.
 */
export default function SubtitlePanel() {
  const tracks = usePlayerStore((s) => s.tracks);

  return (
    <div className="w-64 rounded-lg border border-border bg-bg-elevated p-3 text-sm">
      <p className="mb-2 font-medium">Subtitles</p>
      {/* TODO(subtitle phase): drop zone, track radios, offset controls */}
      {tracks.length === 0 ? (
        <p className="text-xs text-text-muted">
          No subtitles loaded. Drop a .srt / .vtt / .ass file.
        </p>
      ) : (
        <ul className="space-y-1">
          {tracks.map((t) => (
            <li key={t.label}>{t.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
